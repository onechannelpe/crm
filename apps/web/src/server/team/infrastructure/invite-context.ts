import type { Role } from "~/lib/auth/access/rbac";
import { issueSessionTransition } from "~/lib/auth/session/session-transition";
import { db } from "~/lib/db/db";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import type {
  InviteService,
  TeamInviteReadRepos,
} from "~/server/invites/application/types";
import { createInviteServiceContext } from "~/server/invites/infrastructure/invite-service-context";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import { createUsersRepo } from "~/server/users/repos-users";

function createTeamInviteRepos(currentDb: typeof db) {
  return {
    teams: createTeamsRepo(currentDb),
    userInvites: createUserInvitesRepo(currentDb),
    users: createUsersRepo(currentDb),
    sessions: createSessionRepository(currentDb),
    auditLogs: createAuditLogsRepo(currentDb),
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

export function createTeamInviteContext(): TeamInviteContext {
  const repos = createTeamInviteRepos(db);
  const { inviteService } = createInviteServiceContext();

  return {
    repos: {
      teams: repos.teams,
      userInvites: repos.userInvites,
      users: repos.users,
    },
    inviteService,
    async enforceInviteCreateRateLimit(userId: number) {
      await checkActionRateLimit("team.invite.create", userId, {
        actionRateLimits: createActionRateLimitsRepo(db),
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
