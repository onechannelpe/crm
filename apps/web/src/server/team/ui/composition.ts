import "server-only";
import type { MessagingGateway } from "~/server/notifications/channels/messaging-gateway";
import { composeNotifications } from "~/server/notifications/ui/composition";
import {
  serverInfrastructure as defaultServerInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";
import { appConfig } from "~/server/platform/config/env";
import { createTeamInviteContext } from "~/server/team/infrastructure/invite-context";
import { createInviteDelivery } from "~/server/team/infrastructure/invite-delivery";
import { createInviteManagementContext } from "~/server/team/infrastructure/invite-management-context";

function createTeamComposition(
  serverInfrastructure: ServerInfrastructure,
  publicOrigin: string,
  messaging: MessagingGateway,
) {
  const delivery = createInviteDelivery(messaging);

  return {
    invites: createTeamInviteContext(
      serverInfrastructure.db,
      publicOrigin,
      serverInfrastructure.now,
      delivery,
    ),
    inviteManagement: createInviteManagementContext(
      serverInfrastructure.db,
      serverInfrastructure.now,
    ),
    publicOrigin,
  };
}

export function composeTeam() {
  return createTeamComposition(
    defaultServerInfrastructure,
    appConfig().publicOrigin,
    composeNotifications().messaging,
  );
}
