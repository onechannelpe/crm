import type { UserId } from "~/domain/ids";
import type {
  InviteService,
  TeamInviteReadRepos,
} from "~/server/invites/application/types";
import {
  bindInviteRepos,
  createInviteServiceForExecutor,
} from "~/server/invites/infrastructure/invite-service-factory";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { checkActionRateLimit } from "~/server/security/action-rate-limit";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";

import type { InviteDelivery } from "../application/ports";

interface TeamInviteContext {
  repos: TeamInviteReadRepos;
  inviteService: InviteService;
  delivery: InviteDelivery;
  publicOrigin: string;
  enforceInviteCreateRateLimit(userId: UserId, now: Date): Promise<void>;
}

export function createTeamInviteContext(
  executor: DatabaseExecutor,
  publicOrigin: string,
  delivery: InviteDelivery,
): TeamInviteContext {
  const repos = bindInviteRepos(executor);
  const inviteService = createInviteServiceForExecutor(executor);

  return {
    repos: {
      teams: repos.teams,
      userInvites: repos.userInvites,
      users: repos.users,
    },
    inviteService,
    delivery,
    publicOrigin,
    async enforceInviteCreateRateLimit(userId: UserId, now: Date) {
      await checkActionRateLimit(
        "team.invite.create",
        userId,
        {
          actionRateLimits: createActionRateLimitsRepo(executor),
          events: repos.events,
        },
        now,
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
