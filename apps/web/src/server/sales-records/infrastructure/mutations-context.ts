import { db } from "~/lib/db/db";
import { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import { createProductsRepo } from "~/server/inventory/repos-products";
import { createSalesRecordsRepo } from "~/server/sales/repos-sales-records";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";

import type { SalesRecordMutationDeps } from "../application/commands/shared";

export function createSalesRecordMutationsRepos(
  executor: DatabaseExecutor,
): SalesRecordMutationDeps["repos"] {
  return {
    auditLogs: createAuditLogsRepo(executor),
    contactAssignments: createContactAssignmentsRepo(executor),
    products: createProductsRepo(executor),
    salesRecords: createSalesRecordsRepo(executor),
  };
}

export function createSalesRecordMutationRunner(
  executor: DatabaseExecutor,
): SalesRecordMutationDeps["runInTransaction"] {
  return async function runInTransaction<T>(
    operation: (repos: SalesRecordMutationDeps["repos"]) => Promise<T>,
  ): Promise<T> {
    return executor
      .transaction()
      .execute((transactionDb) =>
        operation(createSalesRecordMutationsRepos(transactionDb)),
      );
  };
}

export type SalesRecordMutationsContext = SalesRecordMutationDeps & {
  rateLimitDeps: {
    actionRateLimits: ReturnType<typeof createActionRateLimitsRepo>;
    auditLogs: ReturnType<typeof createAuditLogsRepo>;
  };
};

export function createSalesRecordMutationsContext(): SalesRecordMutationsContext {
  return {
    rateLimitDeps: {
      actionRateLimits: createActionRateLimitsRepo(db),
      auditLogs: createAuditLogsRepo(db),
    },
    repos: createSalesRecordMutationsRepos(db),
    runInTransaction: createSalesRecordMutationRunner(db),
  };
}
