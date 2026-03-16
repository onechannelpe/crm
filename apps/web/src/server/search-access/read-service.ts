import { createSearchAllowanceService } from "./allowance-service";

interface SearchReadServiceDeps {
  allowanceService: ReturnType<typeof createSearchAllowanceService>;
}

export function createSearchReadService(deps: SearchReadServiceDeps) {
  const { allowanceService } = deps;

  return {
    getMySearchSnapshot(userId: number) {
      return allowanceService.getCurrentSearchAllowance(userId);
    },
  };
}
