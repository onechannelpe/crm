import type { Role } from "~/lib/auth/access/rbac";
import { canAssignRole } from "~/lib/auth/access/rbac";
import { generateInviteToken, hashInviteToken } from "~/lib/auth/invite/tokens";
import { hashPassword } from "~/lib/auth/password/password";
import { generateUsername } from "~/lib/users/generate-username";
import { createAuditService } from "~/server/shared/audit";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";
import type { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { createTeamsRepo } from "~/server/users/repos-teams";
import type { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import type { createUsersRepo } from "~/server/users/repos-users";

const DEFAULT_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type ProvisioningRepos = {
  users: ReturnType<typeof createUsersRepo>;
  teams: ReturnType<typeof createTeamsRepo>;
  userInvites: ReturnType<typeof createUserInvitesRepo>;
  auditLogs: ReturnType<typeof createAuditLogsRepo>;
};

export interface PendingBranchInvite {
  inviteId: number;
  userId: number;
  email: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapAcceptedInviteResult(invite: {
  user_id: number;
  user_branch_id: number;
  user_role: Role;
}): { userId: UserId; branchId: BranchId; role: Role } {
  return {
    userId: invite.user_id,
    branchId: invite.user_branch_id,
    role: invite.user_role,
  };
}

function provisioningError(code: string, message: string): DomainError {
  switch (code) {
    case "role_not_assignable":
    case "pending_user_other_branch":
    case "cross_branch_forbidden":
      return domainError("forbidden", code, message);
    case "invalid_team":
    case "invite_invalid_or_expired":
      return domainError("validation", code, message);
    case "active_user_exists":
    case "invite_not_pending":
    case "invite_target_active":
      return domainError("conflict", code, message);
    case "invite_target_missing":
    case "invite_not_found":
      return domainError("not_found", code, message);
    default:
      return domainError("unexpected", "unexpected", message);
  }
}

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

  async function issueInvite(params: {
    repos: ProvisioningRepos;
    actorUserId: number;
    branchId: number;
    userId: number;
    email: string;
    role: Role;
    expiresAt?: number | null;
  }): Promise<{ inviteId: number; token: string; expiresAt: number }> {
    const inviteAudit = createAuditService(params.repos);
    const issuedAt = now();
    const expiresAt = params.expiresAt ?? issuedAt + inviteTtlMs;
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
    async listPendingInvites(
      branchId: BranchId,
    ): Promise<Result<PendingBranchInvite[], DomainError>> {
      try {
        const currentTime = now();
        await repos.userInvites.expirePendingBefore(currentTime);
        const rows = await repos.userInvites.findLatestPendingByBranch(
          branchId,
          currentTime,
        );
        return Ok(
          rows.map((row) => ({
            inviteId: row.invite_id,
            userId: row.user_id,
            email: row.user_email,
            names: row.user_names,
            firstSurname: row.user_first_surname,
            secondSurname: row.user_second_surname,
            role: row.user_role,
            teamId: row.user_team_id,
            expiresAt: row.invite_expires_at,
            createdAt: row.invite_created_at,
            createdByUserId: row.invite_created_by_user_id,
            sentAt: row.invite_sent_at,
          })),
        );
      } catch {
        return Err(
          provisioningError(
            "unexpected",
            "Unexpected pending invites read failure",
          ),
        );
      }
    },

    async createInvite(input: {
      actorUserId: UserId;
      actorRole: Role;
      branchId: BranchId;
      names: string;
      firstSurname: string;
      secondSurname: string;
      email: string;
      role: Role;
      teamId: TeamId | null;
      expiresAt?: number | null;
    }): Promise<
      Result<
        { inviteId: number; token: string; expiresAt: number },
        DomainError
      >
    > {
      if (!canAssignRole(input.actorRole, input.role)) {
        return Err(
          provisioningError(
            "role_not_assignable",
            "You cannot assign the selected role",
          ),
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
              return Err({
                ...provisioningError(
                  "invalid_team",
                  "Invalid team for the selected branch",
                ),
              });
            }
          }

          let user = await transactionRepos.users.findByEmail(email);

          if (user?.is_active === 1) {
            return Err(
              provisioningError(
                "active_user_exists",
                "A user with this email already exists",
              ),
            );
          }
          if (user && user.branch_id !== input.branchId) {
            return Err(
              provisioningError(
                "pending_user_other_branch",
                "A pending user with this email belongs to another branch",
              ),
            );
          }

          if (!user) {
            try {
              const username = await generateUsername(
                input.names,
                input.firstSurname,
                input.secondSurname,
                async (candidate) =>
                  (await transactionRepos.users.findByUsername(candidate)) !==
                  undefined,
              );
              const createdUserId = await transactionRepos.users.create({
                branch_id: input.branchId,
                team_id: input.teamId,
                username,
                email,
                password_hash: await hashPassword(generateInviteToken()),
                names: input.names,
                first_surname: input.firstSurname,
                second_surname: input.secondSurname,
                expires_at: input.expiresAt ?? null,
                phone_e164: null,
                role: input.role,
                is_active: 0,
              });
              user = await transactionRepos.users.findById(createdUserId);
            } catch {
              const racedUser = await transactionRepos.users.findByEmail(email);
              if (!racedUser) {
                return Err(
                  provisioningError(
                    "unexpected",
                    "Unexpected invite target creation failure",
                  ),
                );
              }
              if (racedUser.is_active === 1) {
                return Err(
                  provisioningError(
                    "active_user_exists",
                    "A user with this email already exists",
                  ),
                );
              }
              if (racedUser.branch_id !== input.branchId) {
                return Err(
                  provisioningError(
                    "pending_user_other_branch",
                    "A pending user with this email belongs to another branch",
                  ),
                );
              }
              user = racedUser;
            }
          }

          if (!user) {
            return Err(
              provisioningError(
                "invite_target_missing",
                "Could not provision invite target user",
              ),
            );
          }

          await transactionRepos.users.updateInviteProvisioning(user.id, {
            team_id: input.teamId,
            names: input.names,
            first_surname: input.firstSurname,
            second_surname: input.secondSurname,
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
              expiresAt: input.expiresAt ?? null,
            }),
          );
        });
      } catch {
        return Err(
          provisioningError(
            "unexpected",
            "Unexpected invite provisioning failure",
          ),
        );
      }
    },

    async resendInvite(input: {
      actorUserId: UserId;
      actorRole: Role;
      branchId: BranchId;
      inviteId: number;
    }): Promise<
      Result<
        { inviteId: number; token: string; expiresAt: number },
        DomainError
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
            return Err(
              provisioningError("invite_not_found", "Invite not found"),
            );
          }
          if (invite.branch_id !== input.branchId) {
            return Err(
              provisioningError(
                "cross_branch_forbidden",
                "Cannot manage invites from another branch",
              ),
            );
          }
          if (invite.status !== "pending") {
            return Err(
              provisioningError(
                "invite_not_pending",
                "Only pending invites can be resent",
              ),
            );
          }

          const user = await transactionRepos.users.findById(invite.user_id);
          if (!user || user.branch_id !== input.branchId) {
            return Err(
              provisioningError(
                "invite_target_missing",
                "Invite target user was not found",
              ),
            );
          }
          if (user.is_active === 1) {
            return Err(
              provisioningError(
                "invite_target_active",
                "Invite target user is already active",
              ),
            );
          }
          if (!canAssignRole(input.actorRole, user.role)) {
            return Err(
              provisioningError(
                "role_not_assignable",
                "You cannot manage invites for this role",
              ),
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
              expiresAt: invite.expires_at,
            }),
          );
        });
      } catch {
        return Err(
          provisioningError("unexpected", "Unexpected invite resend failure"),
        );
      }
    },

    async revokeInvite(input: {
      actorUserId: UserId;
      actorRole: Role;
      branchId: BranchId;
      inviteId: number;
    }): Promise<Result<void, DomainError>> {
      try {
        return await runInTransaction(async (transactionRepos) => {
          const invite = await transactionRepos.userInvites.findById(
            input.inviteId,
          );
          if (!invite) {
            return Err(
              provisioningError("invite_not_found", "Invite not found"),
            );
          }
          if (invite.branch_id !== input.branchId) {
            return Err(
              provisioningError(
                "cross_branch_forbidden",
                "Cannot manage invites from another branch",
              ),
            );
          }
          if (invite.status !== "pending") {
            return Err(
              provisioningError(
                "invite_not_pending",
                "Only pending invites can be revoked",
              ),
            );
          }

          const user = await transactionRepos.users.findById(invite.user_id);
          if (!user) {
            return Err(
              provisioningError(
                "invite_target_missing",
                "Invite target user was not found",
              ),
            );
          }
          if (!canAssignRole(input.actorRole, user.role)) {
            return Err(
              provisioningError(
                "role_not_assignable",
                "You cannot manage invites for this role",
              ),
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
        return Err(
          provisioningError("unexpected", "Unexpected invite revoke failure"),
        );
      }
    },

    async markInviteDelivered(
      inviteId: number,
    ): Promise<Result<void, DomainError>> {
      try {
        await runInTransaction(async (transactionRepos) => {
          await transactionRepos.userInvites.markSent(inviteId, now());
        });
        return Ok(undefined);
      } catch {
        return Err(
          provisioningError(
            "unexpected",
            "Unexpected invite delivery mark failure",
          ),
        );
      }
    },

    async acceptInvite(input: {
      token: string;
      passwordHash: string;
    }): Promise<
      Result<{ userId: UserId; branchId: BranchId; role: Role }, DomainError>
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
            return Err(
              provisioningError(
                "invite_invalid_or_expired",
                "Invite is invalid or expired",
              ),
            );
          }
          if (invite.user_is_active === 1) {
            return Err(
              provisioningError(
                "invite_target_active",
                "Invite target user is already active",
              ),
            );
          }

          await transactionRepos.users.updateInviteProvisioning(
            invite.user_id,
            {
              team_id: invite.user_team_id,
              names: invite.user_names,
              first_surname: invite.user_first_surname,
              second_surname: invite.user_second_surname,
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
          return Ok(mapAcceptedInviteResult(invite));
        });
      } catch {
        return Err(
          provisioningError(
            "unexpected",
            "Unexpected invite acceptance failure",
          ),
        );
      }
    },
  };
}
