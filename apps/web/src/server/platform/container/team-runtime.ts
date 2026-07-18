import { createTeamInviteContext } from "~/server/team/infrastructure/invite-context";
import { createInviteManagementContext } from "~/server/team/infrastructure/invite-management-context";

import type { ServerInfra } from "./infra";

export function createTeamRuntime(infra: ServerInfra, publicOrigin: string) {
  return {
    invites: createTeamInviteContext(infra.db, publicOrigin),
    inviteManagement: createInviteManagementContext(infra.db),
    publicOrigin,
  };
}
