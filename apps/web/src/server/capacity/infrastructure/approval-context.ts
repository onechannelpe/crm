import { checkActionRateLimit } from "~/lib/security/action-rate-limit";

import type {
  CapacityApprovalPort,
  CapacityApprovalTxPort,
} from "../application/ports";
import { createCapacityCommandsContext } from "./commands-context";

export function createCapacityApprovalContext(): CapacityApprovalPort {
  const context = createCapacityCommandsContext();

  return {
    async enforceApprovalRateLimit(userId: number) {
      await checkActionRateLimit(
        "capacity.approve",
        userId,
        context.rateLimitDeps,
      );
    },
    withTransaction<T>(operation: (tx: CapacityApprovalTxPort) => Promise<T>) {
      return context.runInRepositoryTransaction((repos) =>
        operation({
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
            return {
              role: user.role,
              branchId: user.branch_id,
              teamId: user.team_id,
            };
          },
          findSupervisedTeamBySupervisorId(supervisorId) {
            return repos.teams.findBySupervisorId(supervisorId);
          },
          async findManagedTeamById(teamId) {
            const team = await repos.teams.findByIdWithSupervisor(teamId);
            if (!team) {
              return undefined;
            }
            return {
              id: team.id,
              branchId: team.branch_id,
              supervisorId: team.supervisor_id,
            };
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
        }),
      );
    },
  };
}
