import { rateLimitDeps, salesRecordsService } from "~/server/shared/context";

export function createSalesRecordMutationsContext() {
  return {
    rateLimitDeps,
    salesRecordsService,
  };
}

export type SalesRecordMutationsContext = ReturnType<
  typeof createSalesRecordMutationsContext
>;
