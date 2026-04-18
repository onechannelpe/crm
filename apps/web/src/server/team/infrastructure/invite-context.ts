import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import type {
  InviteService,
  TeamInviteReadRepos,
} from "~/server/invites/application/types";
import { createInviteServiceContext } from "~/server/invites/infrastructure/invite-service-context";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { asTeamId, asUserId, type UserId } from "~/server/shared/ids";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import { createUsersRepo } from "~/server/users/repos-users";

function createTeamInviteRepos(executor: DatabaseExecutor) {
  return {
    teams: createTeamsRepo(executor),
    userInvites: createUserInvitesRepo(executor),
    users: createUsersRepo(executor),
    auditLogs: createAuditLogsRepo(executor),
  };
}

interface TeamInviteContext {
  repos: TeamInviteReadRepos;
  inviteService: InviteService;
  enforceInviteCreateRateLimit(userId: UserId): Promise<void>;
}

export function createTeamInviteContext(
  executor: DatabaseExecutor,
): TeamInviteContext {
  const repos = createTeamInviteRepos(executor);
  const { inviteService } = createInviteServiceContext(executor);

  return {
    repos: {
      teams: {
        async findByBranch(branchId) {
          const teams = await repos.teams.findByBranch(branchId);
          return teams.map((team) => ({
            id: asTeamId(team.id),
            name: team.name,
          }));
        },
      },
      userInvites: {
        async findById(inviteId) {
          const invite = await repos.userInvites.findById(inviteId);
          return invite ? { user_id: asUserId(invite.user_id) } : undefined;
        },
        async findPendingByTokenHash(tokenHash, now) {
          return repos.userInvites.findPendingByTokenHash(tokenHash, now);
        },
      },
      users: {
        async findById(id) {
          const user = await repos.users.findById(id);
          if (!user) {
            return undefined;
          }
          return {
            id: asUserId(user.id),
            email: user.email,
            role: user.role,
            names: user.names,
            first_surname: user.first_surname,
            second_surname: user.second_surname,
          };
        },
      },
    },
    inviteService,
    async enforceInviteCreateRateLimit(userId: UserId) {
      await checkActionRateLimit("team.invite.create", userId, {
        actionRateLimits: createActionRateLimitsRepo(executor),
        auditLogs: repos.auditLogs,
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
