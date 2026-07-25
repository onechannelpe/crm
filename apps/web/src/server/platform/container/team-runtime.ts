import type { MessagingGateway } from "~/server/notifications/channels/messaging-gateway";
import { createTeamInviteContext } from "~/server/team/infrastructure/invite-context";
import { createInviteDelivery } from "~/server/team/infrastructure/invite-delivery";
import { createInviteManagementContext } from "~/server/team/infrastructure/invite-management-context";

import type { ServerInfra } from "./infra";

export function createTeamRuntime(
  infra: ServerInfra,
  publicOrigin: string,
  messaging: MessagingGateway,
) {
  const delivery = createInviteDelivery(messaging);

  return {
    invites: createTeamInviteContext(
      infra.db,
      publicOrigin,
      infra.now,
      delivery,
    ),
    inviteManagement: createInviteManagementContext(infra.db, infra.now),
    publicOrigin,
  };
}
