import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

export interface CreateCapacityRequestInput {
  userId: UserId;
  amount: number;
  reason: string;
}

export function createCapacityRequestService(repos: Repositories) {
  async function createRequest(
    input: CreateCapacityRequestInput,
    kind: "search_extra" | "lead_refill_extra",
  ): Promise<Result<void, DomainError>> {
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
      return Err(
        domainError(
          "unexpected",
          "unexpected",
          error instanceof Error ? error.message : "Request creation failed",
        ),
      );
    }
  }

  return {
    async createSearchExtraRequest(
      input: CreateCapacityRequestInput,
    ): Promise<Result<void, DomainError>> {
      return createRequest(input, "search_extra");
    },

    async createLeadRefillExtraRequest(
      input: CreateCapacityRequestInput,
    ): Promise<Result<void, DomainError>> {
      return createRequest(input, "lead_refill_extra");
    },
  };
}
