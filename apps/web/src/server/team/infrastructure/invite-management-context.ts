import { createEventsRepo } from "~/server/event-logs/events-repo";
import { createInviteServiceForExecutor } from "~/server/invites/infrastructure/invite-service-factory";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import { createUsersRepo } from "~/server/users/repos-users";

import type { InviteManagementQueryPort } from "../application/ports";

export function createInviteManagementContext(
  executor: DatabaseExecutor,
): InviteManagementQueryPort {
  const inviteService = createInviteServiceForExecutor(executor);
  const repos = {
    events: createEventsRepo(executor),
    teams: createTeamsRepo(executor),
    userInvites: createUserInvitesRepo(executor),
    users: createUsersRepo(executor),
  };

  return {
    async listTeamsByBranch(branchId) {
      const teams = await repos.teams.findByBranch(branchId);
      return teams.map((team) => ({ id: team.id, name: team.name }));
    },
    listPendingInvites(branchId, operation) {
      return inviteService.listPendingInvites(branchId, operation);
    },
  };
}
