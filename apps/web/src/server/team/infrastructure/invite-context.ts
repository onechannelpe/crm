import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import type {
  InviteService,
  TeamInviteReadRepos,
} from "~/server/invites/application/types";
import { createInviteServiceContext } from "~/server/invites/infrastructure/invite-service-context";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createEventsRepo } from "~/server/shared/repos-events";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import { createUsersRepo } from "~/server/users/repos-users";

function createTeamInviteRepos(executor: DatabaseExecutor) {
  return {
    teams: createTeamsRepo(executor),
    userInvites: createUserInvitesRepo(executor),
    users: createUsersRepo(executor),
    events: createEventsRepo(executor),
  };
}

interface TeamInviteContext {
  repos: TeamInviteReadRepos;
  inviteService: InviteService;
  enforceInviteCreateRateLimit(userId: number): Promise<void>;
}

export function createTeamInviteContext(
  executor: DatabaseExecutor,
): TeamInviteContext {
  const repos = createTeamInviteRepos(executor);
  const { inviteService } = createInviteServiceContext(executor);

  return {
    repos: {
      teams: repos.teams,
      userInvites: repos.userInvites,
      users: repos.users,
    },
    inviteService,
    async enforceInviteCreateRateLimit(userId: number) {
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
