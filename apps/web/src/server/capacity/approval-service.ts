import { createLeadRefillService } from "~/server/lead-operations/refill-service";
import { createSearchAllowanceService } from "~/server/search-access/allowance-service";
import type { Repositories } from "~/server/shared/registry";

export function createCapacityApprovalService(repos: Repositories) {
  const searchAllowance = createSearchAllowanceService(repos);
  const leadRefill = createLeadRefillService(repos);

  return {
    async approveCapacityRequest(
      actorUserId: number,
      requestId: number,
      note: string | null,
    ) {
      const request = await repos.capacityRequests.findById(requestId);
      if (!request || request.status !== "pending") {
        throw new Error("Request is no longer pending");
      }

      const statusUpdate = await repos.capacityRequests.markApproved(
        request.id,
        actorUserId,
        note,
      );
      if (!statusUpdate.numUpdatedRows) {
        throw new Error("Request approval did not update any rows");
      }

      if (request.kind === "search_extra") {
        await searchAllowance.grantExtraSearchAllowance(
          actorUserId,
          request.user_id,
          request.requested_amount,
          note ?? request.reason,
        );
      } else {
        await leadRefill.grantExtraLeadRefill(
          actorUserId,
          request.user_id,
          request.requested_amount,
          note ?? request.reason,
        );
      }
      return { success: true };
    },

    async rejectCapacityRequest(
      actorUserId: number,
      requestId: number,
      note: string,
    ) {
      const request = await repos.capacityRequests.findById(requestId);
      if (!request || request.status !== "pending") {
        throw new Error("Request is no longer pending");
      }
      const result = await repos.capacityRequests.markRejected(
        request.id,
        actorUserId,
        note,
      );
      if (!result.numUpdatedRows) {
        throw new Error("Request rejection did not update any rows");
      }
      return { success: true };
    },
  };
}
