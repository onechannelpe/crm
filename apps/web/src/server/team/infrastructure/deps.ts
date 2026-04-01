import type { Role } from "~/lib/auth/access/rbac";
import { issueSessionTransition } from "~/lib/auth/session/session-transition";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import {
  rateLimitDeps,
  repos,
  runInRepositoryTransaction,
} from "~/server/shared/context";
import { createUserProvisioningService } from "~/server/users/service-user-provisioning";

export function createTeamDeps() {
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

export type TeamDeps = ReturnType<typeof createTeamDeps>;

export type TeamInviteManagementDeps = {
  repos: {
    teams: {
      findByBranch(
        branchId: number,
      ): Promise<Array<{ id: number; name: string }>>;
    };
  };
  createProvisioningService(): {
    listPendingInvites: ReturnType<
      TeamDeps["createProvisioningService"]
    >["listPendingInvites"];
  };
};

export function createTeamInviteManagementDeps(): TeamInviteManagementDeps {
  return {
    repos: {
      teams: repos.teams,
    },
    createProvisioningService() {
      const provisioning = createUserProvisioningService(repos, {
        runInTransaction: runInRepositoryTransaction,
      });
      return {
        listPendingInvites(branchId: number) {
          return provisioning.listPendingInvites(branchId);
        },
      };
    },
  };
}
