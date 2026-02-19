import { config } from "~/lib/config";
import { db } from "~/lib/db/db";
import { createClientSearchService } from "~/server/client-search/service";
import { createLeadAssignmentService } from "~/server/leads/service";
import { createAppNotificationCenter } from "~/server/notifications/app-center-service";
import { createObservabilityService } from "~/server/observability/service";
import { createQuotaService } from "~/server/quota/service";
import { createDocumentBlobStore } from "~/server/sales/document-blob-store";
import { createSalesDocumentService } from "~/server/sales/document-service";
import { createSalesWorkflowService } from "~/server/sales/service";
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
export const salesDocumentService = createSalesDocumentService(
  repos,
  createDocumentBlobStore(config.uploads.storageRoot),
);
export const salesService = createSalesWorkflowService(repos, {
  notifications: appNotificationCenter,
});

export { repos };
