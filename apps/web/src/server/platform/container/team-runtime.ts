import type { MessagingGateway } from "~/server/notifications/channels/messaging-gateway";
import { appConfig } from "~/server/platform/config/env";
import { createTeamInviteContext } from "~/server/team/infrastructure/invite-context";
import { createInviteDelivery } from "~/server/team/infrastructure/invite-delivery";
import { createInviteManagementContext } from "~/server/team/infrastructure/invite-management-context";

import { infra, type ServerInfra } from "./infra";
import { memo } from "./memo";
import { getNotificationsRuntime } from "./notifications-runtime";

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

export const getTeamRuntime = memo(() =>
  createTeamRuntime(
    infra,
    appConfig().publicOrigin,
    getNotificationsRuntime().messaging,
  ),
);
