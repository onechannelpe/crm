import { createLeadRefillService } from "./refill-service";

interface LeadReadServiceDeps {
  refillService: ReturnType<typeof createLeadRefillService>;
}

export function createLeadReadService(deps: LeadReadServiceDeps) {
  const { refillService } = deps;

  return {
    getMyLeadSnapshot(userId: number) {
      return refillService.getCurrentLeadCapacity(userId);
    },
  };
}
