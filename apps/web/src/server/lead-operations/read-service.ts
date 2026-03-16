import type {
  EffectiveLeadPolicy,
  LeadPolicyError,
} from "~/server/lead-operations/policy-service";
import type {
  LeadCapacitySnapshot,
  LeadCapacitySnapshotError,
} from "~/server/lead-operations/refill-service";
import type { Repositories } from "~/server/shared/registry";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { createLeadPolicyService } from "./policy-service";
import { createLeadRefillService } from "./refill-service";

interface LeadOperationsReadServiceDeps {
  repos: Repositories;
  leadRefillService: ReturnType<typeof createLeadRefillService>;
  leadPolicyService: ReturnType<typeof createLeadPolicyService>;
}

export function createLeadOperationsReadService(
  _deps: LeadOperationsReadServiceDeps,
) {
  const { leadRefillService, leadPolicyService } = _deps;

  return {
    async getLeadCapacitySnapshot(
      userId: number,
    ): Promise<Result<LeadCapacitySnapshot, LeadCapacitySnapshotError>> {
      return leadRefillService.getCurrentLeadCapacity(userId);
    },

    async getEffectiveLeadPolicy(
      userId: number,
    ): Promise<Result<EffectiveLeadPolicy, LeadPolicyError>> {
      const policyResult =
        await leadPolicyService.getEffectiveLeadPolicy(userId);
      if (isErr(policyResult)) {
        return Err(policyResult.error);
      }
      return Ok(policyResult.value);
    },
  };
}
