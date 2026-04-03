import type { Role } from "~/lib/auth/access/rbac";
import { issueSessionTransition } from "~/lib/auth/session/session-transition";
import { db } from "~/lib/db/db";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import { createUsersRepo } from "~/server/users/repos-users";
import { createUserProvisioningService } from "~/server/users/service-user-provisioning";

function createTeamInviteRepos(currentDb: typeof db) {
  return {
    teams: createTeamsRepo(currentDb),
    userInvites: createUserInvitesRepo(currentDb),
    users: createUsersRepo(currentDb),
    sessions: createSessionRepository(currentDb),
    auditLogs: createAuditLogsRepo(currentDb),
  };
}

export function createTeamInviteContext() {
  const repos = createTeamInviteRepos(db);

  return {
    repos: {
      teams: repos.teams,
      userInvites: repos.userInvites,
      users: repos.users,
    },
    createProvisioningService() {
      return createUserProvisioningService(repos, {
        runInTransaction(operation) {
          return db
            .transaction()
            .execute((transactionDb) =>
              operation(createTeamInviteRepos(transactionDb)),
            );
        },
      });
    },
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

type TeamInviteContext = ReturnType<typeof createTeamInviteContext>;

export type TeamInviteRepos = TeamInviteContext["repos"];
export type TeamInviteProvisioningContext = Pick<
  TeamInviteContext,
  "createProvisioningService"
>;
export type TeamInviteCreateContext = Pick<
  TeamInviteContext,
  "createProvisioningService" | "enforceInviteCreateRateLimit"
>;
export type TeamInviteResendContext = Pick<
  TeamInviteContext,
  "repos" | "createProvisioningService"
>;
export type TeamInviteAcceptanceContext = Pick<
  TeamInviteContext,
  "createProvisioningService" | "issuePreAuthSession"
>;
