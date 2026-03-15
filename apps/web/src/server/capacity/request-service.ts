import { config } from "~/lib/config";
import type { Repositories } from "~/server/shared/registry";

export function createCapacityRequestService(repos: Repositories) {
  return {
    async createSearchExtraRequest(
      userId: number,
      amount: number,
      reason: string,
    ) {
      if (amount > config.capacityRequests.maxRequestAmount) {
        throw new Error("Search request exceeds configured maximum");
      }
      return repos.capacityRequests.create({
        user_id: userId,
        kind: "search_extra",
        status: "pending",
        requested_amount: amount,
        reason,
      });
    },

    async createLeadRefillExtraRequest(
      userId: number,
      amount: number,
      reason: string,
    ) {
      if (amount > config.capacityRequests.maxRequestAmount) {
        throw new Error("Lead refill request exceeds configured maximum");
      }
      return repos.capacityRequests.create({
        user_id: userId,
        kind: "lead_refill_extra",
        status: "pending",
        requested_amount: amount,
        reason,
      });
    },
  };
}
