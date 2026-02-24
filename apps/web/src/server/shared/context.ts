import { config } from "~/lib/config";
import { db } from "~/lib/db/db";
import { createClientSearchService } from "~/server/client-search/service";
import { createLeadAssignmentService } from "~/server/leads/service";
import { createAppNotificationCenter } from "~/server/notifications/app-center-service";
import { createObservabilityService } from "~/server/observability/service";
import { createQuotaService } from "~/server/quota/service";
import { createSalesExportBlobStore } from "~/server/sales/export-blob-store";
import { createSalesExportService } from "~/server/sales/export-service";
import { createSalesRecordsWorkflowService } from "~/server/sales/records-service";
import { createRepositories } from "~/server/shared/registry";

const repos = createRepositories(db);

export function runInRepositoryTransaction<T>(
  operation: (
    transactionRepos: ReturnType<typeof createRepositories>,
  ) => Promise<T>,
): Promise<T> {
  return db
    .transaction()
    .execute((transactionDb) => operation(createRepositories(transactionDb)));
}

export const appNotificationCenter = createAppNotificationCenter({
  repos: { appNotifications: repos.appNotifications, users: repos.users },
});
export const clientSearchService = createClientSearchService();
export const quotaService = createQuotaService(repos);
export const leadService = createLeadAssignmentService(repos);
export const observabilityService = createObservabilityService({
  actionObservations: repos.actionObservations,
});
export const salesExportBlobStore = createSalesExportBlobStore(
  config.uploads.storageRoot,
);
export const salesExportService = createSalesExportService(
  repos,
  salesExportBlobStore,
);
export const salesRecordsService = createSalesRecordsWorkflowService(repos);

export { repos };
