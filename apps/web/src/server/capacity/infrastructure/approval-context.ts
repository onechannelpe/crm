import { checkActionRateLimit } from "~/lib/security/action-rate-limit";

import type {
  CapacityApprovalPort,
  CapacityApprovalTxPort,
} from "../application/ports";
import type {
  CapacityCommandsContext,
  CapacityRepos,
} from "./commands-context";

function toApprovalTxPort(repos: CapacityRepos): CapacityApprovalTxPort {
  return {
    async findRequestById(requestId) {
      const request = await repos.capacityRequests.findById(requestId);
      if (!request) {
        return undefined;
      }
      return {
        id: request.id,
        userId: request.user_id,
        kind: request.kind,
        status: request.status,
        requestedAmount: request.requested_amount,
        reason: request.reason,
      };
    },
    async markRequestApproved(requestId, actorUserId, note) {
      const result = await repos.capacityRequests.markApproved(
        requestId,
        actorUserId,
        note,
      );
      return Boolean(result?.numUpdatedRows);
    },
    async markRequestRejected(requestId, actorUserId, note) {
      const result = await repos.capacityRequests.markRejected(
        requestId,
        actorUserId,
        note,
      );
      return Boolean(result?.numUpdatedRows);
    },
    async findManagedUserById(userId) {
      const user = await repos.users.findById(userId);
      if (!user) {
        return undefined;
      }
      return user;
    },
    async findManagedTeamById(teamId) {
      const team = await repos.teams.findById(teamId);
      if (!team) {
        return undefined;
      }
      return team;
    },
    async findBranchSupervisors(branchId) {
      return repos.branchSupervisors.findByBranch(branchId);
    },
    async grantSearchCapacity(input) {
      await repos.searchCapacityGrants.insert({
        user_id: input.userId,
        amount: input.amount,
        reason: input.reason,
        actor_user_id: input.actorUserId,
      });
    },
    async grantLeadCapacity(input) {
      await repos.leadCapacityGrants.insert({
        user_id: input.userId,
        amount: input.amount,
        reason: input.reason,
        actor_user_id: input.actorUserId,
      });
    },
  };
}

export function createCapacityApprovalContext(
  context: CapacityCommandsContext,
): CapacityApprovalPort {
  return {
    async enforceApprovalRateLimit(userId: number) {
      await checkActionRateLimit(
        "capacity.approve",
        userId,
        context.rateLimitDeps,
      );
    },
    uow: {
      run: (work) => context.uow.run((repos) => work(toApprovalTxPort(repos))),
    },
  };
}
