import type { CapacityRequestError } from "~/server/capacity/errors";
import type { UserId } from "~/server/shared/ids";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

export type { CapacityRequestError } from "~/server/capacity/errors";

export interface CreateCapacityRequestInput {
  userId: UserId;
  amount: number;
  reason: string;
}

export function createCapacityRequestService(repos: Repositories) {
  return {
    async createSearchExtraRequest(
      input: CreateCapacityRequestInput,
    ): Promise<Result<void, CapacityRequestError>> {
      try {
        await repos.capacityRequests.create({
          user_id: input.userId,
          kind: "search_extra",
          status: "pending",
          requested_amount: input.amount,
          reason: input.reason,
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
      input: CreateCapacityRequestInput,
    ): Promise<Result<void, CapacityRequestError>> {
      try {
        await repos.capacityRequests.create({
          user_id: input.userId,
          kind: "lead_refill_extra",
          status: "pending",
          requested_amount: input.amount,
          reason: input.reason,
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
