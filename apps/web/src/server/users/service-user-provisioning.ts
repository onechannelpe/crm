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

export function createUserProvisioningService(
  repos: ProvisioningRepos,
  deps: UserProvisioningDeps = {},
) {
  const now = deps.now ?? Date.now;
  const inviteTtlMs = deps.inviteTtlMs ?? DEFAULT_INVITE_TTL_MS;
  const audit = createAuditService(repos);

  async function issueInvite(params: {
    actorUserId: number;
    branchId: number;
    userId: number;
    email: string;
    role: Role;
  }): Promise<{ inviteId: number; token: string; expiresAt: number }> {
    const issuedAt = now();
    const expiresAt = issuedAt + inviteTtlMs;
    await repos.userInvites.revokePendingByUser(params.userId, issuedAt);

    const token = generateInviteToken();
    const inviteId = await repos.userInvites.create({
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

    await audit.log(
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
      Result<{ inviteId: number; token: string; expiresAt: number }, string>
    > {
      if (!canAssignRole(input.actorRole, input.role)) {
        return Err("You cannot assign the selected role");
      }

      if (input.teamId !== null) {
        const team = await repos.teams.findByIdWithSupervisor(input.teamId);
        if (!team || team.branch_id !== input.branchId) {
          return Err("Invalid team for the selected branch");
        }
      }

      const email = normalizeEmail(input.email);
      const existing = await repos.users.findByEmail(email);

      if (existing && existing.is_active === 1) {
        return Err("A user with this email already exists");
      }

      if (existing && existing.branch_id !== input.branchId) {
        return Err("A pending user with this email belongs to another branch");
      }

      const userId =
        existing?.id ??
        (await repos.users.create({
          branch_id: input.branchId,
          email,
          password_hash: await hashPassword(generateInviteToken()),
          full_name: input.fullName,
          phone_e164: null,
          role: input.role,
        }));

      await repos.users.updateInviteProvisioning(userId, {
        team_id: input.teamId,
        full_name: input.fullName,
        role: input.role,
        is_active: 0,
      });

      return Ok(
        await issueInvite({
          actorUserId: input.actorUserId,
          branchId: input.branchId,
          userId,
          email,
          role: input.role,
        }),
      );
    },

    async resendInvite(input: {
      actorUserId: number;
      actorRole: Role;
      branchId: number;
      inviteId: number;
    }): Promise<
      Result<{ inviteId: number; token: string; expiresAt: number }, string>
    > {
      const currentTime = now();
      await repos.userInvites.expirePendingBefore(currentTime);

      const invite = await repos.userInvites.findById(input.inviteId);
      if (!invite) {
        return Err("Invite not found");
      }
      if (invite.branch_id !== input.branchId) {
        return Err("Cannot manage invites from another branch");
      }
      if (invite.status !== "pending") {
        return Err("Only pending invites can be resent");
      }

      const user = await repos.users.findById(invite.user_id);
      if (!user || user.branch_id !== input.branchId) {
        return Err("Invite target user was not found");
      }
      if (user.is_active === 1) {
        return Err("Invite target user is already active");
      }
      if (!canAssignRole(input.actorRole, user.role)) {
        return Err("You cannot manage invites for this role");
      }

      return Ok(
        await issueInvite({
          actorUserId: input.actorUserId,
          branchId: input.branchId,
          userId: user.id,
          email: user.email,
          role: user.role,
        }),
      );
    },

    async revokeInvite(input: {
      actorUserId: number;
      actorRole: Role;
      branchId: number;
      inviteId: number;
    }): Promise<Result<void, string>> {
      const invite = await repos.userInvites.findById(input.inviteId);
      if (!invite) {
        return Err("Invite not found");
      }
      if (invite.branch_id !== input.branchId) {
        return Err("Cannot manage invites from another branch");
      }
      if (invite.status !== "pending") {
        return Err("Only pending invites can be revoked");
      }

      const user = await repos.users.findById(invite.user_id);
      if (!user) {
        return Err("Invite target user was not found");
      }
      if (!canAssignRole(input.actorRole, user.role)) {
        return Err("You cannot manage invites for this role");
      }

      await repos.userInvites.revokePendingByUser(invite.user_id, now());
      await audit.log(
        input.actorUserId,
        "user_invite_revoked",
        "user",
        invite.user_id,
        {
          inviteId: invite.id,
        },
      );
      return Ok(undefined);
    },

    async markInviteDelivered(inviteId: number): Promise<void> {
      await repos.userInvites.markSent(inviteId, now());
    },

    async acceptInvite(input: {
      token: string;
      fullName: string;
      passwordHash: string;
    }): Promise<
      Result<{ userId: number; branchId: number; role: Role }, string>
    > {
      const currentTime = now();
      await repos.userInvites.expirePendingBefore(currentTime);

      const invite = await repos.userInvites.findPendingByTokenHash(
        hashInviteToken(input.token),
        currentTime,
      );
      if (!invite) {
        return Err("Invite is invalid or expired");
      }
      if (invite.user_is_active === 1) {
        return Err("Invite target user is already active");
      }

      await repos.users.updateInviteProvisioning(invite.user_id, {
        team_id: invite.user_team_id,
        full_name: input.fullName,
        role: invite.user_role,
        is_active: 1,
      });
      await repos.users.updatePassword(invite.user_id, input.passwordHash);
      await repos.userInvites.markAccepted(invite.invite_id, currentTime);
      await audit.log(
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
    },
  };
}
