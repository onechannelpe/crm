import type { Kysely } from "kysely";

import type { UserId } from "~/domain/ids";
import type {
  InviteService,
  TeamInviteReadRepos,
} from "~/server/invites/application/types";
import {
  bindInviteBaseRepos,
  createInviteServiceForExecutor,
} from "~/server/invites/infrastructure/invite-service-factory";
import type { AppContext } from "~/server/platform/action/context";
import type { Database } from "~/server/platform/database/types";
import { createActionRateLimiter } from "~/server/security/action-rate-limit";

import type { InviteDelivery } from "../application/ports";

interface TeamInviteContext {
  repos: TeamInviteReadRepos;
  inviteService: InviteService;
  delivery: InviteDelivery;
  publicOrigin: string;
  enforceInviteCreateRateLimit(
    userId: UserId,
    context: AppContext,
  ): Promise<void>;
}

export function createTeamInviteContext(
  executor: Kysely<Database>,
  publicOrigin: string,
  delivery: InviteDelivery,
): TeamInviteContext {
  const inviteService = createInviteServiceForExecutor(executor);
  const rateLimiter = createActionRateLimiter(executor);

  return {
    repos: bindInviteBaseRepos(executor),
    inviteService,
    delivery,
    publicOrigin,
    async enforceInviteCreateRateLimit(userId: UserId, context: AppContext) {
      await rateLimiter.enforce(
        "team.invite.create",
        userId,
        context,
        context.ipAddress,
      );
    },
  };
}

export type TeamInviteRepos = TeamInviteContext["repos"];
export type TeamInviteProvisioningContext = Pick<
  TeamInviteContext,
  "inviteService"
>;
export type TeamInviteCreateContext = Pick<
  TeamInviteContext,
  "delivery" | "inviteService" | "enforceInviteCreateRateLimit" | "publicOrigin"
>;
export type TeamInviteResendContext = Pick<
  TeamInviteContext,
  "delivery" | "repos" | "inviteService" | "publicOrigin"
>;
export type TeamBulkImportContext = Pick<
  TeamInviteContext,
  "delivery" | "inviteService" | "publicOrigin"
>;
