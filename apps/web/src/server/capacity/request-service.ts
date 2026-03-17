import { config } from "~/lib/config";
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

function validateRequestInput(
  input: CreateCapacityRequestInput,
): Result<{ amount: number; reason: string }, CapacityRequestError> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return Err({
      reason: "validation",
      message: "amount must be a positive integer",
    });
  }

  if (input.amount > config.capacityRequests.maxRequestAmount) {
    return Err({
      reason: "validation",
      message: "amount exceeds configured maximum",
    });
  }

  const reason = input.reason.trim();
  if (reason.length === 0) {
    return Err({
      reason: "validation",
      message: "reason must be a non-empty string",
    });
  }

  return Ok({ amount: input.amount, reason });
}

export function createCapacityRequestService(repos: Repositories) {
  async function createRequest(
    input: CreateCapacityRequestInput,
    kind: "search_extra" | "lead_refill_extra",
  ): Promise<Result<void, CapacityRequestError>> {
    const validated = validateRequestInput(input);
    if (!validated.ok) {
      return validated;
    }

    try {
      await repos.capacityRequests.create({
        user_id: input.userId,
        kind,
        status: "pending",
        requested_amount: validated.value.amount,
        reason: validated.value.reason,
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
