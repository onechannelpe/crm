import { db } from "~/lib/db/db";
import { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import { createContactsRepo } from "~/server/contacts/repos-contacts";
import { createOrganizationsRepo } from "~/server/contacts/repos-organizations";
import { createProductsRepo } from "~/server/inventory/repos-products";
import { createSalesRecordsRepo } from "~/server/sales/repos-sales-records";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createInteractionLogsRepo } from "~/server/shared/repos-interaction-logs";

function createContactAssignmentInteractionRepos(executor: DatabaseExecutor) {
  return {
    auditLogs: createAuditLogsRepo(executor),
    contactAssignments: createContactAssignmentsRepo(executor),
    contacts: createContactsRepo(executor),
    interactionLogs: createInteractionLogsRepo(executor),
    organizations: createOrganizationsRepo(executor),
    products: createProductsRepo(executor),
    salesRecords: createSalesRecordsRepo(executor),
  };
}

export type ContactAssignmentInteractionRepos = ReturnType<
  typeof createContactAssignmentInteractionRepos
>;

export type ContactAssignmentInteractionRunner = <T>(
  operation: (repos: ContactAssignmentInteractionRepos) => Promise<T>,
) => Promise<T>;

export function runContactAssignmentInteraction<T>(
  operation: (repos: ContactAssignmentInteractionRepos) => Promise<T>,
) {
  return db
    .transaction()
    .execute((transactionDb) =>
      operation(createContactAssignmentInteractionRepos(transactionDb)),
    );
}
