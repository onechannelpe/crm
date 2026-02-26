import type { Role } from "~/lib/auth/access/rbac";
import { generateInviteToken, hashInviteToken } from "~/lib/auth/invite/tokens";
import { hashPassword } from "~/lib/auth/password/password";
import { createAuditService } from "~/server/shared/audit";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

const DEFAULT_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type ProvisioningRepos = Pick<
  Repositories,
  "users" | "teams" | "userInvites" | "auditLogs"
>;

export interface PendingBranchInvite {
  inviteId: number;
  userId: number;
  email: string;
  fullName: string;
  role: Role;
  teamId: number | null;
  expiresAt: number;
  createdAt: number;
  createdByUserId: number;
  sentAt: number | null;
}

export interface UserProvisioningDeps {
  inviteTtlMs?: number;
  now?: () => number;
  runInTransaction?: <T>(
    operation: (repos: ProvisioningRepos) => Promise<T>,
  ) => Promise<T>;
}

function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "superuser") return targetRole !== "superuser";
  if (actorRole === "admin") return targetRole !== "superuser";
  if (actorRole === "hr") {
    return targetRole !== "admin" && targetRole !== "superuser";
  }
  return false;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type UserProvisioningError =
  | { reason: "role_not_assignable"; message: string }
  | { reason: "invalid_team"; message: string }
  | { reason: "active_user_exists"; message: string }
  | { reason: "pending_user_other_branch"; message: string }
  | { reason: "invite_target_missing"; message: string }
  | { reason: "invite_not_found"; message: string }
  | { reason: "cross_branch_forbidden"; message: string }
  | { reason: "invite_not_pending"; message: string }
  | { reason: "invite_target_active"; message: string }
  | { reason: "invite_invalid_or_expired"; message: string }
  | { reason: "unexpected"; message: string };

export function createUserProvisioningService(
  repos: ProvisioningRepos,
  deps: UserProvisioningDeps = {},
) {
  const now = deps.now ?? Date.now;
  const inviteTtlMs = deps.inviteTtlMs ?? DEFAULT_INVITE_TTL_MS;
  const runInTransaction =
    deps.runInTransaction ??
    (async <T>(
      operation: (provisioningRepos: ProvisioningRepos) => Promise<T>,
    ) => operation(repos));

  function fail(
    reason: UserProvisioningError["reason"],
    message: string,
  ): Result<never, UserProvisioningError> {
    return Err({ reason, message });
  }

  async function issueInvite(params: {
    repos: ProvisioningRepos;
    actorUserId: number;
    branchId: number;
    userId: number;
    email: string;
    role: Role;
  }): Promise<{ inviteId: number; token: string; expiresAt: number }> {
    const inviteAudit = createAuditService(params.repos);
    const issuedAt = now();
    const expiresAt = issuedAt + inviteTtlMs;
    await params.repos.userInvites.revokePendingByUser(params.userId, issuedAt);

    const token = generateInviteToken();
    const inviteId = await params.repos.userInvites.create({
      user_id: params.userId,
      branch_id: params.branchId,
      email: params.email,
      role: params.role,
      token_hash: hashInviteToken(token),
      status: "pending",
      expires_at: expiresAt,
      created_by_user_id: params.actorUserId,
      accepted_at: null,
      revoked_at: null,
      created_at: issuedAt,
      sent_at: null,
    });

    await inviteAudit.log(
      params.actorUserId,
      "user_invite_issued",
      "user",
      params.userId,
      {
        inviteId,
        email: params.email,
        role: params.role,
        expiresAt,
      },
    );

    return { inviteId, token, expiresAt };
  }

  return {
    async listPendingInvites(branchId: number): Promise<PendingBranchInvite[]> {
      const currentTime = now();
      await repos.userInvites.expirePendingBefore(currentTime);
      const rows = await repos.userInvites.findLatestPendingByBranch(
        branchId,
        currentTime,
      );
      return rows.map((row) => ({
        inviteId: row.invite_id,
        userId: row.user_id,
        email: row.user_email,
        fullName: row.user_full_name,
        role: row.user_role,
        teamId: row.user_team_id,
        expiresAt: row.invite_expires_at,
        createdAt: row.invite_created_at,
        createdByUserId: row.invite_created_by_user_id,
        sentAt: row.invite_sent_at,
      }));
    },

    async createInvite(input: {
      actorUserId: number;
      actorRole: Role;
      branchId: number;
      fullName: string;
      email: string;
      role: Role;
      teamId: number | null;
    }): Promise<
      Result<
        { inviteId: number; token: string; expiresAt: number },
        UserProvisioningError
      >
    > {
      if (!canAssignRole(input.actorRole, input.role)) {
        return fail(
          "role_not_assignable",
          "You cannot assign the selected role",
        );
      }
      const email = normalizeEmail(input.email);
      try {
        return await runInTransaction(async (transactionRepos) => {
          if (input.teamId !== null) {
            const team = await transactionRepos.teams.findByIdWithSupervisor(
              input.teamId,
            );
            if (!team || team.branch_id !== input.branchId) {
              return fail(
                "invalid_team",
                "Invalid team for the selected branch",
              );
            }
          }

          let user = await transactionRepos.users.findByEmail(email);

          if (user?.is_active === 1) {
            return fail(
              "active_user_exists",
              "A user with this email already exists",
            );
          }
          if (user && user.branch_id !== input.branchId) {
            return fail(
              "pending_user_other_branch",
              "A pending user with this email belongs to another branch",
            );
          }

          if (!user) {
            try {
              const createdUserId = await transactionRepos.users.create({
                branch_id: input.branchId,
                email,
                password_hash: await hashPassword(generateInviteToken()),
                full_name: input.fullName,
                phone_e164: null,
                role: input.role,
              });
              user = await transactionRepos.users.findById(createdUserId);
            } catch {
              const racedUser = await transactionRepos.users.findByEmail(email);
              if (!racedUser) {
                return fail(
                  "unexpected",
                  "Unexpected invite target creation failure",
                );
              }
              if (racedUser.is_active === 1) {
                return fail(
                  "active_user_exists",
                  "A user with this email already exists",
                );
              }
              if (racedUser.branch_id !== input.branchId) {
                return fail(
                  "pending_user_other_branch",
                  "A pending user with this email belongs to another branch",
                );
              }
              user = racedUser;
            }
          }

          if (!user) {
            return fail(
              "invite_target_missing",
              "Could not provision invite target user",
            );
          }

          await transactionRepos.users.updateInviteProvisioning(user.id, {
            team_id: input.teamId,
            full_name: input.fullName,
            role: input.role,
            is_active: 0,
          });

          return Ok(
            await issueInvite({
              repos: transactionRepos,
              actorUserId: input.actorUserId,
              branchId: input.branchId,
              userId: user.id,
              email,
              role: input.role,
            }),
          );
        });
      } catch {
        return fail("unexpected", "Unexpected invite provisioning failure");
      }
    },

    async resendInvite(input: {
      actorUserId: number;
      actorRole: Role;
      branchId: number;
      inviteId: number;
    }): Promise<
      Result<
        { inviteId: number; token: string; expiresAt: number },
        UserProvisioningError
      >
    > {
      try {
        return await runInTransaction(async (transactionRepos) => {
          const currentTime = now();
          await transactionRepos.userInvites.expirePendingBefore(currentTime);

          const invite = await transactionRepos.userInvites.findById(
            input.inviteId,
          );
          if (!invite) {
            return fail("invite_not_found", "Invite not found");
          }
          if (invite.branch_id !== input.branchId) {
            return fail(
              "cross_branch_forbidden",
              "Cannot manage invites from another branch",
            );
          }
          if (invite.status !== "pending") {
            return fail(
              "invite_not_pending",
              "Only pending invites can be resent",
            );
          }

          const user = await transactionRepos.users.findById(invite.user_id);
          if (!user || user.branch_id !== input.branchId) {
            return fail(
              "invite_target_missing",
              "Invite target user was not found",
            );
          }
          if (user.is_active === 1) {
            return fail(
              "invite_target_active",
              "Invite target user is already active",
            );
          }
          if (!canAssignRole(input.actorRole, user.role)) {
            return fail(
              "role_not_assignable",
              "You cannot manage invites for this role",
            );
          }

          return Ok(
            await issueInvite({
              repos: transactionRepos,
              actorUserId: input.actorUserId,
              branchId: input.branchId,
              userId: user.id,
              email: user.email,
              role: user.role,
            }),
          );
        });
      } catch {
        return fail("unexpected", "Unexpected invite resend failure");
      }
    },

    async revokeInvite(input: {
      actorUserId: number;
      actorRole: Role;
      branchId: number;
      inviteId: number;
    }): Promise<Result<void, UserProvisioningError>> {
      try {
        return await runInTransaction(async (transactionRepos) => {
          const invite = await transactionRepos.userInvites.findById(
            input.inviteId,
          );
          if (!invite) {
            return fail("invite_not_found", "Invite not found");
          }
          if (invite.branch_id !== input.branchId) {
            return fail(
              "cross_branch_forbidden",
              "Cannot manage invites from another branch",
            );
          }
          if (invite.status !== "pending") {
            return fail(
              "invite_not_pending",
              "Only pending invites can be revoked",
            );
          }

          const user = await transactionRepos.users.findById(invite.user_id);
          if (!user) {
            return fail(
              "invite_target_missing",
              "Invite target user was not found",
            );
          }
          if (!canAssignRole(input.actorRole, user.role)) {
            return fail(
              "role_not_assignable",
              "You cannot manage invites for this role",
            );
          }

          await transactionRepos.userInvites.revokePendingByUser(
            invite.user_id,
            now(),
          );
          await createAuditService(transactionRepos).log(
            input.actorUserId,
            "user_invite_revoked",
            "user",
            invite.user_id,
            {
              inviteId: invite.id,
            },
          );
          return Ok(undefined);
        });
      } catch {
        return fail("unexpected", "Unexpected invite revoke failure");
      }
    },

    async markInviteDelivered(inviteId: number): Promise<void> {
      await runInTransaction(async (transactionRepos) => {
        await transactionRepos.userInvites.markSent(inviteId, now());
      });
    },

    async acceptInvite(input: {
      token: string;
      fullName: string;
      passwordHash: string;
    }): Promise<
      Result<
        { userId: number; branchId: number; role: Role },
        UserProvisioningError
      >
    > {
      try {
        return await runInTransaction(async (transactionRepos) => {
          const currentTime = now();
          await transactionRepos.userInvites.expirePendingBefore(currentTime);

          const invite =
            await transactionRepos.userInvites.findPendingByTokenHash(
              hashInviteToken(input.token),
              currentTime,
            );
          if (!invite) {
            return fail(
              "invite_invalid_or_expired",
              "Invite is invalid or expired",
            );
          }
          if (invite.user_is_active === 1) {
            return fail(
              "invite_target_active",
              "Invite target user is already active",
            );
          }

          await transactionRepos.users.updateInviteProvisioning(
            invite.user_id,
            {
              team_id: invite.user_team_id,
              full_name: input.fullName,
              role: invite.user_role,
              is_active: 1,
            },
          );
          await transactionRepos.users.updatePassword(
            invite.user_id,
            input.passwordHash,
          );
          await transactionRepos.userInvites.markAccepted(
            invite.invite_id,
            currentTime,
          );
          await createAuditService(transactionRepos).log(
            invite.user_id,
            "user_invite_accepted",
            "user",
            invite.user_id,
            {
              inviteId: invite.invite_id,
            },
          );
          return Ok({
            userId: invite.user_id,
            branchId: invite.user_branch_id,
            role: invite.user_role,
          });
        });
      } catch {
        return fail("unexpected", "Unexpected invite acceptance failure");
      }
    },
  };
}
