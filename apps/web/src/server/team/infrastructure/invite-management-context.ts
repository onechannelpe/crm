import { db } from "~/lib/db/db";
import { createInviteServiceContext } from "~/server/invites/infrastructure/invite-service-context";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import { createUsersRepo } from "~/server/users/repos-users";

import type { InviteManagementQueryPort } from "../application/ports";

export function createInviteManagementContext(): InviteManagementQueryPort {
  const { inviteService } = createInviteServiceContext();
  const repos = {
    auditLogs: createAuditLogsRepo(db),
    teams: createTeamsRepo(db),
    userInvites: createUserInvitesRepo(db),
    users: createUsersRepo(db),
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
