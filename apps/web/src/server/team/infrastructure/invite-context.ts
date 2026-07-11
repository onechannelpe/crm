import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import type {
  InviteService,
  TeamInviteReadRepos,
} from "~/server/invites/application/types";
import {
  bindInviteRepos,
  createInviteServiceForExecutor,
} from "~/server/invites/infrastructure/invite-service-factory";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { UserId } from "~/server/shared/ids";

interface TeamInviteContext {
  repos: TeamInviteReadRepos;
  inviteService: InviteService;
  enforceInviteCreateRateLimit(userId: UserId): Promise<void>;
}

export function createTeamInviteContext(
  executor: DatabaseExecutor,
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
    async enforceInviteCreateRateLimit(userId: UserId) {
      await checkActionRateLimit("team.invite.create", userId, {
        actionRateLimits: createActionRateLimitsRepo(executor),
        events: repos.events,
      });
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
  "inviteService" | "enforceInviteCreateRateLimit"
>;
export type TeamInviteResendContext = Pick<
  TeamInviteContext,
  "repos" | "inviteService"
>;
