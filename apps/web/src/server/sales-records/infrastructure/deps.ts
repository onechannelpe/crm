import {
  repos,
  rateLimitDeps,
  salesRecordsService,
} from "~/server/shared/context";

export function createSalesRecordDeps() {
  return {
    repos: {
      products: repos.products,
      leadAssignments: repos.leadAssignments,
      contacts: repos.contacts,
      organizations: repos.organizations,
      salesRecords: repos.salesRecords,
    },
    rateLimitDeps,
    salesRecordsService,
  };
}

export type SalesRecordDeps = ReturnType<typeof createSalesRecordDeps>;
