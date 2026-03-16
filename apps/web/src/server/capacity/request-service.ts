import { config } from "~/lib/config";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

export type CapacityRequestError =
  | { reason: "validation"; message: string }
  | { reason: "unexpected"; message: string };

export function createCapacityRequestService(repos: Repositories) {
  return {
    async createSearchExtraRequest(
      userId: number,
      amount: number,
      reason: string,
    ): Promise<Result<void, CapacityRequestError>> {
      if (amount > config.capacityRequests.maxRequestAmount) {
        return Err({
          reason: "validation",
          message: "Search request exceeds configured maximum",
        });
      }

      try {
        await repos.capacityRequests.create({
          user_id: userId,
          kind: "search_extra",
          status: "pending",
          requested_amount: amount,
          reason,
        });
        return Ok(undefined);
      } catch (error) {
        return Err({
          reason: "unexpected",
          message:
            error instanceof Error ? error.message : "Request creation failed",
        });
      }
    },

    async createLeadRefillExtraRequest(
      userId: number,
      amount: number,
      reason: string,
    ): Promise<Result<void, CapacityRequestError>> {
      if (amount > config.capacityRequests.maxRequestAmount) {
        return Err({
          reason: "validation",
          message: "Lead refill request exceeds configured maximum",
        });
      }

      try {
        await repos.capacityRequests.create({
          user_id: userId,
          kind: "lead_refill_extra",
          status: "pending",
          requested_amount: amount,
          reason,
        });
        return Ok(undefined);
      } catch (error) {
        return Err({
          reason: "unexpected",
          message:
            error instanceof Error ? error.message : "Request creation failed",
        });
      }
    },
  };
}
