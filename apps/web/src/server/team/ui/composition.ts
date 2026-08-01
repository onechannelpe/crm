import "server-only";
import type { MessagingGateway } from "~/server/notifications/channels/messaging-gateway";
import type { ServerInfrastructure } from "~/server/platform/composition/infrastructure";
import { applyBulkImport } from "~/server/team/application/bulk-import";
import {
  createTeamInvite,
  getInviteInfo,
  getInviteManagement,
  resendTeamInvite,
  revokeTeamInvite,
} from "~/server/team/application/invites";
import { createTeamInviteContext } from "~/server/team/infrastructure/invite-context";
import { createInviteDelivery } from "~/server/team/infrastructure/invite-delivery";
import { createInviteManagementContext } from "~/server/team/infrastructure/invite-management-context";

export function createTeamComposition(
  serverInfrastructure: ServerInfrastructure,
  publicOrigin: string,
  messaging: MessagingGateway,
) {
  const delivery = createInviteDelivery(messaging);
  const invites = createTeamInviteContext(
    serverInfrastructure.db,
    publicOrigin,
    delivery,
  );
  const inviteManagement = createInviteManagementContext(
    serverInfrastructure.db,
  );

  return {
    invites: {
      create: (
        ctx: Parameters<typeof createTeamInvite>[0],
        input: Parameters<typeof createTeamInvite>[2],
      ) => createTeamInvite(ctx, invites, input),
      resend: (
        ctx: Parameters<typeof resendTeamInvite>[0],
        input: Parameters<typeof resendTeamInvite>[2],
      ) => resendTeamInvite(ctx, invites, input),
      revoke: (
        ctx: Parameters<typeof revokeTeamInvite>[0],
        input: Parameters<typeof revokeTeamInvite>[2],
      ) => revokeTeamInvite(ctx, invites, input),
      applyBulkImport: (
        ctx: Parameters<typeof applyBulkImport>[0],
        input: Parameters<typeof applyBulkImport>[2],
      ) => applyBulkImport(ctx, invites, input),
      getInfo: (token: string, asOf: Date) =>
        getInviteInfo({ token, repos: invites.repos, asOf }),
    },
    management: {
      get: (ctx: Parameters<typeof getInviteManagement>[0]) =>
        getInviteManagement(ctx, inviteManagement, publicOrigin),
    },
  };
}
