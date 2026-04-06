import { db } from "~/lib/db/db";
import { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import { createContactsRepo } from "~/server/contacts/repos-contacts";
import { createOrganizationsRepo } from "~/server/contacts/repos-organizations";
import { createProductsRepo } from "~/server/inventory/repos-products";
import { createSalesRecordsRepo } from "~/server/sales/repos-sales-records";

export function createSalesRecordReadContext() {
  return {
    repos: {
      products: createProductsRepo(db),
      contactAssignments: createContactAssignmentsRepo(db),
      contacts: createContactsRepo(db),
      organizations: createOrganizationsRepo(db),
      salesRecords: createSalesRecordsRepo(db),
    },
  };
}

export type SalesRecordReadContext = ReturnType<
  typeof createSalesRecordReadContext
>;
