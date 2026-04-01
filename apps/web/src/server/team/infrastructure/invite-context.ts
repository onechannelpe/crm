import type { Role } from "~/lib/auth/access/rbac";
import { issueSessionTransition } from "~/lib/auth/session/session-transition";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import {
  rateLimitDeps,
  repos,
  runInRepositoryTransaction,
} from "~/server/shared/context";
import { createUserProvisioningService } from "~/server/users/service-user-provisioning";

export function createTeamInviteContext() {
  return {
    repos: {
      teams: repos.teams,
      userInvites: repos.userInvites,
      users: repos.users,
    },
    createProvisioningService() {
      return createUserProvisioningService(repos, {
        runInTransaction: runInRepositoryTransaction,
      });
    },
    async enforceInviteCreateRateLimit(userId: number) {
      await checkActionRateLimit("team.invite.create", userId, rateLimitDeps);
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
