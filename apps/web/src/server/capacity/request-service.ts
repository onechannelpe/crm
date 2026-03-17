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
  async function createRequest(
    input: CreateCapacityRequestInput,
    kind: "search_extra" | "lead_refill_extra",
  ): Promise<Result<void, CapacityRequestError>> {
    try {
      await repos.capacityRequests.create({
        user_id: input.userId,
        kind,
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
  }

  return {
    async createSearchExtraRequest(
      input: CreateCapacityRequestInput,
    ): Promise<Result<void, CapacityRequestError>> {
      return createRequest(input, "search_extra");
    },

    async createLeadRefillExtraRequest(
      input: CreateCapacityRequestInput,
    ): Promise<Result<void, CapacityRequestError>> {
      return createRequest(input, "lead_refill_extra");
    },
  };
}
