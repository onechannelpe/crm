import type { Role } from "~/lib/auth/access/rbac";
import { issueSessionTransition } from "~/lib/auth/session/session-transition";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import type {
  InviteService,
  TeamInviteReadRepos,
} from "~/server/invites/application/types";
import { createInviteServiceContext } from "~/server/invites/infrastructure/invite-service-context";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import { createUsersRepo } from "~/server/users/repos-users";

function createTeamInviteRepos(executor: DatabaseExecutor) {
  return {
    teams: createTeamsRepo(executor),
    userInvites: createUserInvitesRepo(executor),
    users: createUsersRepo(executor),
    sessions: createSessionRepository(executor),
    auditLogs: createAuditLogsRepo(executor),
  };
}

interface TeamInviteContext {
  repos: TeamInviteReadRepos;
  inviteService: InviteService;
  enforceInviteCreateRateLimit(userId: number): Promise<void>;
  issuePreAuthSession(input: {
    user: {
      id: number;
      branch_id: number;
      role: Role;
      onboarding_completed_at: null;
    };
    request: {
      ipAddress: string;
      userAgent: string | null;
    };
  }): Promise<{ token: string }>;
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
        auditLogs: repos.auditLogs,
      });
    },
    issuePreAuthSession(input: {
      user: {
        id: number;
        branch_id: number;
        role: Role;
        onboarding_completed_at: null;
      };
      request: {
        ipAddress: string;
        userAgent: string | null;
      };
    }) {
      return issueSessionTransition({
        user: input.user,
        sessionClass: "pre_auth",
        request: input.request,
        primaryAuthMethod: "password",
        strongAuthMethod: null,
        strongAuthAt: null,
        deps: repos,
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
export type TeamInviteAcceptanceContext = Pick<
  TeamInviteContext,
  "inviteService" | "issuePreAuthSession"
>;
