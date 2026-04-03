import { db } from "~/lib/db/db";
import { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import { createContactsRepo } from "~/server/contacts/repos-contacts";
import { createProductsRepo } from "~/server/inventory/repos-products";
import { createSalesRecordsWorkflowService } from "../application/workflow-service";
import { createSalesRecordsRepo } from "~/server/sales/repos-sales-records";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";

function createSalesRecordMutationsRepos(executor: DatabaseExecutor) {
  return {
    auditLogs: createAuditLogsRepo(executor),
    contactAssignments: createContactAssignmentsRepo(executor),
    contacts: createContactsRepo(executor),
    products: createProductsRepo(executor),
    salesRecords: createSalesRecordsRepo(executor),
  };
}

export function createSalesRecordMutationsContext() {
  return {
    rateLimitDeps: {
      actionRateLimits: createActionRateLimitsRepo(db),
      auditLogs: createAuditLogsRepo(db),
    },
    salesRecordsService: createSalesRecordsWorkflowService(
      createSalesRecordMutationsRepos(db),
      (operation) =>
        db
          .transaction()
          .execute((transactionDb) =>
            operation(createSalesRecordMutationsRepos(transactionDb)),
          ),
    ),
  };
}

export type SalesRecordMutationsContext = ReturnType<
  typeof createSalesRecordMutationsContext
>;
export type SalesRecordsMutationService =
  SalesRecordMutationsContext["salesRecordsService"];
