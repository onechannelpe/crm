import type {
  SearchAllowanceSnapshot,
  SearchAllowanceSnapshotError,
} from "~/server/search-access/allowance-service";
import type {
  EffectiveSearchPolicy,
  SearchPolicyError,
} from "~/server/search-access/policy-service";
import type { Repositories } from "~/server/shared/registry";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { createSearchAllowanceService } from "./allowance-service";
import { createSearchPolicyService } from "./policy-service";

interface SearchAccessReadServiceDeps {
  repos: Repositories;
  searchAllowanceService: ReturnType<typeof createSearchAllowanceService>;
  searchPolicyService: ReturnType<typeof createSearchPolicyService>;
}

export function createSearchAccessReadService(
  _deps: SearchAccessReadServiceDeps,
) {
  const { searchAllowanceService, searchPolicyService } = _deps;

  return {
    async getSearchAllowanceSnapshot(
      userId: number,
    ): Promise<Result<SearchAllowanceSnapshot, SearchAllowanceSnapshotError>> {
      return searchAllowanceService.getCurrentSearchAllowance(userId);
    },

    async getEffectiveSearchPolicy(
      userId: number,
    ): Promise<Result<EffectiveSearchPolicy, SearchPolicyError>> {
      const policyResult =
        await searchPolicyService.getEffectiveSearchPolicy(userId);
      if (isErr(policyResult)) {
        return Err(policyResult.error);
      }
      return Ok(policyResult.value);
    },
  };
}
