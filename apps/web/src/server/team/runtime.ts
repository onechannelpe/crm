import type { Role } from "~/lib/auth/access/rbac";
import { issueSessionTransition } from "~/lib/auth/session/session-transition";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import {
  rateLimitDeps,
  repos,
  runInRepositoryTransaction,
} from "~/server/shared/context";
import { createUserProvisioningService } from "~/server/users/service-user-provisioning";

export function createTeamProvisioning() {
  return createUserProvisioningService(repos, {
    runInTransaction: runInRepositoryTransaction,
  });
}

export function createTeamInviteRuntime() {
  return {
    repos: {
      teams: repos.teams,
      userInvites: repos.userInvites,
      users: repos.users,
    },
    provisioning: createTeamProvisioning(),
    enforceInviteCreateRateLimit(userId: number) {
      return checkActionRateLimit("team.invite.create", userId, rateLimitDeps);
    },
  };
}

export function createTeamAcceptanceRuntime() {
  return {
    provisioning: createTeamProvisioning(),
    async issuePreAuthSession(input: {
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
