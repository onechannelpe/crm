import type { DatabaseExecutor } from "~/server/shared/db-executor";
import {
  asBranchId,
  asTeamId,
  asUserId,
  type BranchId,
  type TeamId,
  type UserId,
} from "~/server/shared/ids";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import { createUsersRepo } from "~/server/users/repos-users";

import { createInviteService } from "../application/invite-service";
import type { InviteDeps, InviteWithUserRecord } from "../application/types";

function mapPendingInviteWithUser(row: {
  invite_id: number;
  invite_status: "pending" | "accepted" | "revoked" | "expired";
  invite_expires_at: number;
  invite_created_at: number;
  invite_created_by_user_id: string;
  invite_sent_at: number | null;
  user_id: string;
  user_email: string;
  user_role:
    | "executive"
    | "supervisor"
    | "back_office"
    | "sales_manager"
    | "logistics"
    | "hr"
    | "admin"
    | "superuser";
  user_branch_id: string;
  user_team_id: string | null;
  user_names: string;
  user_first_surname: string;
  user_second_surname: string;
  user_username?: string;
  user_is_active: number;
}): InviteWithUserRecord {
  return {
    ...row,
    invite_created_by_user_id: asUserId(row.invite_created_by_user_id),
    user_id: asUserId(row.user_id),
    user_branch_id: asBranchId(row.user_branch_id),
    user_team_id: row.user_team_id === null ? null : asTeamId(row.user_team_id),
  };
}

function createInviteRepos(executor: DatabaseExecutor): InviteDeps {
  const auditLogs = createAuditLogsRepo(executor);
  const teams = createTeamsRepo(executor);
  const userInvites = createUserInvitesRepo(executor);
  const users = createUsersRepo(executor);

  return {
    auditLogs: {
      create(values) {
        return auditLogs.create(values);
      },
    },
    teams: {
      async findByIdWithSupervisor(id: TeamId) {
        const team = await teams.findByIdWithSupervisor(id);
        if (!team) {
          return undefined;
        }
        return {
          id: asTeamId(team.id),
          branch_id: asBranchId(team.branch_id),
        };
      },
    },
    userInvites: {
      create(values) {
        return userInvites.create(values);
      },
      async findLatestPendingByBranch(branchId: BranchId, now: number) {
        const invites = await userInvites.findLatestPendingByBranch(
          branchId,
          now,
        );
        return invites.map(mapPendingInviteWithUser);
      },
      async findById(inviteId: number) {
        const invite = await userInvites.findById(inviteId);
        if (!invite) {
          return undefined;
        }
        return {
          id: invite.id,
          user_id: asUserId(invite.user_id),
          branch_id: asBranchId(invite.branch_id),
          status: invite.status,
          expires_at: invite.expires_at,
        };
      },
      async findPendingByTokenHash(tokenHash: string, now: number) {
        const invite = await userInvites.findPendingByTokenHash(tokenHash, now);
        return invite ? mapPendingInviteWithUser(invite) : undefined;
      },
      revokePendingByUser(userId: UserId, revokedAt: number) {
        return userInvites.revokePendingByUser(userId, revokedAt);
      },
      expirePendingBefore(now: number) {
        return userInvites.expirePendingBefore(now);
      },
      markAccepted(inviteId: number, acceptedAt: number) {
        return userInvites.markAccepted(inviteId, acceptedAt);
      },
      markSent(inviteId: number, sentAt: number) {
        return userInvites.markSent(inviteId, sentAt);
      },
    },
    users: {
      async findById(id: UserId) {
        const user = await users.findById(id);
        if (!user) {
          return undefined;
        }
        return {
          id: asUserId(user.id),
          branch_id: asBranchId(user.branch_id),
          role: user.role,
          email: user.email,
          names: user.names,
          first_surname: user.first_surname,
          second_surname: user.second_surname,
          is_active: user.is_active,
        };
      },
      async findByEmail(email: string) {
        const user = await users.findByEmail(email);
        if (!user) {
          return undefined;
        }
        return {
          id: asUserId(user.id),
          branch_id: asBranchId(user.branch_id),
          role: user.role,
          email: user.email,
          is_active: user.is_active,
        };
      },
      async findByUsername(username: string) {
        const user = await users.findByUsername(username);
        return user ? { id: asUserId(user.id) } : undefined;
      },
      create(values) {
        return users.create(values).then((id) => asUserId(id));
      },
      updateInviteProvisioning(id: UserId, values) {
        return users.updateInviteProvisioning(id, values);
      },
      updatePassword(id: UserId, passwordHash: string) {
        return users.updatePassword(id, passwordHash);
      },
    },
  };
}

export function createInviteServiceContext(executor: DatabaseExecutor) {
  const repos = createInviteRepos(executor);

  const inviteService = createInviteService(repos, {
    runInTransaction(operation) {
      return executor
        .transaction()
        .execute((transactionDb) =>
          operation(createInviteRepos(transactionDb)),
        );
    },
  });

  return {
    repos,
    inviteService,
  };
}
