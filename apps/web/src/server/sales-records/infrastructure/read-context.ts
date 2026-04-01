import { repos } from "~/server/shared/context";

export function createSalesRecordReadContext() {
  return {
    repos: {
      products: repos.products,
      leadAssignments: repos.leadAssignments,
      contacts: repos.contacts,
      organizations: repos.organizations,
      salesRecords: repos.salesRecords,
    },
  };
}

export type SalesRecordReadContext = ReturnType<
  typeof createSalesRecordReadContext
>;
