import { createInviteServiceContext } from "~/server/invites/infrastructure/invite-service-context";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import { createUsersRepo } from "~/server/users/repos-users";

import type { InviteManagementQueryPort } from "../application/ports";

export function createInviteManagementContext(
  executor: DatabaseExecutor,
): InviteManagementQueryPort {
  const { inviteService } = createInviteServiceContext(executor);
  const repos = {
    auditLogs: createAuditLogsRepo(executor),
    teams: createTeamsRepo(executor),
    userInvites: createUserInvitesRepo(executor),
    users: createUsersRepo(executor),
  };

  return {
    async listTeamsByBranch(branchId) {
      const teams = await repos.teams.findByBranch(branchId);
      return teams.map((team) => ({ id: team.id, name: team.name }));
    },
    listPendingInvites(branchId) {
      return inviteService.listPendingInvites(branchId);
    },
  };
}
