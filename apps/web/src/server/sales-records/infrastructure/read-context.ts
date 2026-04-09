import { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import { createContactsRepo } from "~/server/contacts/repos-contacts";
import { createOrganizationsRepo } from "~/server/contacts/repos-organizations";
import { createProductsRepo } from "~/server/inventory/repos-products";
import { createSalesRecordsRepo } from "~/server/sales/repos-sales-records";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export function createSalesRecordReadContext(executor: DatabaseExecutor) {
  return {
    repos: {
      products: createProductsRepo(executor),
      contactAssignments: createContactAssignmentsRepo(executor),
      contacts: createContactsRepo(executor),
      organizations: createOrganizationsRepo(executor),
      salesRecords: createSalesRecordsRepo(executor),
    },
  };
}

export type SalesRecordReadContext = ReturnType<
  typeof createSalesRecordReadContext
>;
