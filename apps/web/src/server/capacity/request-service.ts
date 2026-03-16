import { config } from "~/lib/config";
import {
  isPositiveAmount,
  normalizeCapacityReason,
} from "~/server/capacity/domain";
import type { CapacityRequestError } from "~/server/capacity/errors";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

export type { CapacityRequestError } from "~/server/capacity/errors";

export function createCapacityRequestService(repos: Repositories) {
  return {
    async createSearchExtraRequest(
      userId: number,
      amount: number,
      reason: string,
    ): Promise<Result<void, CapacityRequestError>> {
      if (!isPositiveAmount(amount)) {
        return Err({
          reason: "validation",
          message: "Search request amount must be a positive integer",
        });
      }
      if (amount > config.capacityRequests.maxRequestAmount) {
        return Err({
          reason: "validation",
          message: "Search request exceeds configured maximum",
        });
      }
      const normalizedReason = normalizeCapacityReason(reason);
      if (normalizedReason.length === 0) {
        return Err({
          reason: "validation",
          message: "Search request reason is required",
        });
      }

      try {
        await repos.capacityRequests.create({
          user_id: userId,
          kind: "search_extra",
          status: "pending",
          requested_amount: amount,
          reason: normalizedReason,
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
      if (!isPositiveAmount(amount)) {
        return Err({
          reason: "validation",
          message: "Lead refill request amount must be a positive integer",
        });
      }
      if (amount > config.capacityRequests.maxRequestAmount) {
        return Err({
          reason: "validation",
          message: "Lead refill request exceeds configured maximum",
        });
      }
      const normalizedReason = normalizeCapacityReason(reason);
      if (normalizedReason.length === 0) {
        return Err({
          reason: "validation",
          message: "Lead refill request reason is required",
        });
      }

      try {
        await repos.capacityRequests.create({
          user_id: userId,
          kind: "lead_refill_extra",
          status: "pending",
          requested_amount: amount,
          reason: normalizedReason,
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
