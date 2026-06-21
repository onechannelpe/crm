import { createTeamInviteContext } from "~/server/team/infrastructure/invite-context";
import { createInviteManagementContext } from "~/server/team/infrastructure/invite-management-context";

import type { ServerInfra } from "./infra";

export function createTeamRuntime(infra: ServerInfra) {
  return {
    invites: createTeamInviteContext(infra.db),
    inviteManagement: createInviteManagementContext(infra.db),
  };
}
