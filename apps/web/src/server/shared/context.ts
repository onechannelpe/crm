import { createNotificationService } from "@crm/notifications";

import { createPrivilegedLoginAlertSender } from "~/lib/auth/security/login-alerts";
import { config } from "~/lib/config";
import { db } from "~/lib/db/db";
import { env } from "~/lib/env";
import { createCapacityApprovalService } from "~/server/capacity/approval-service";
import { createCapacityReadService } from "~/server/capacity/read-service";
import { createCapacityRequestService } from "~/server/capacity/request-service";
import { createSearchEnrichmentService } from "~/server/client-search/enrichment-service";
import { createEngineSearchService } from "~/server/engine-gateway/search-service";
import { createExtensionService } from "~/server/extension/service";
import { createLeadReadService } from "~/server/lead-operations/read-service";
import { createLeadRefillService } from "~/server/lead-operations/refill-service";
import { createAppNotificationCenter } from "~/server/notifications/app-center-service";
import { createObservabilityService } from "~/server/observability/service";
import { createSalesExportBlobStore } from "~/server/sales/export-blob-store";
import { createSalesExportService } from "~/server/sales/export-service";
import { createSalesRecordsWorkflowService } from "~/server/sales/records-service";
import { createSearchAllowanceService } from "~/server/search-access/allowance-service";
import { createSearchReadService } from "~/server/search-access/read-service";
import { createRepositories } from "~/server/shared/registry";
import { createProfilePictureBlobStore } from "~/server/users/profile-picture-blob-store";
import { createProfilePictureService } from "~/server/users/profile-picture-service";

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
export const searchEnrichmentService = createSearchEnrichmentService(repos);
export const engineSearchService = createEngineSearchService();
export const searchAllowanceService = createSearchAllowanceService(repos);
export const searchReadService = createSearchReadService(repos);
export const leadRefillService = createLeadRefillService(repos);
export const leadReadService = createLeadReadService(repos);
export const capacityRequestService = createCapacityRequestService(repos);
export const capacityApprovalService = createCapacityApprovalService(repos);
export const capacityReadService = createCapacityReadService(repos);
export const extensionService = createExtensionService(repos, {
  runInTransaction: runInRepositoryTransaction,
});
export const observabilityService = createObservabilityService({
  actionObservations: repos.actionObservations,
  authFunnelEvents: repos.authFunnelEvents,
});
export const salesExportBlobStore = createSalesExportBlobStore(
  config.uploads.storageRoot,
);
export const profilePictureBlobStore = createProfilePictureBlobStore(
  config.uploads.storageRoot,
);
export const salesExportService = createSalesExportService(
  repos,
  salesExportBlobStore,
);
export const profilePictureService = createProfilePictureService(
  repos,
  profilePictureBlobStore,
);
export const salesRecordsService = createSalesRecordsWorkflowService(
  repos,
  runInRepositoryTransaction,
);

export const notificationSender = createNotificationService({
  resendApiKey: env.resendApiKey || undefined,
  fromEmail: env.emailFrom || undefined,
  whatsappAccessToken: env.whatsappAccessToken || undefined,
  whatsappPhoneNumberId: env.whatsappPhoneNumberId || undefined,
  whatsappApiVersion: env.whatsappApiVersion || undefined,
});

export const privilegedLoginAlertSender = createPrivilegedLoginAlertSender(
  repos,
  {
    resendApiKey: env.resendApiKey || undefined,
    fromEmail: env.emailFrom || undefined,
    whatsappAccessToken: env.whatsappAccessToken || undefined,
    whatsappPhoneNumberId: env.whatsappPhoneNumberId || undefined,
    whatsappApiVersion: env.whatsappApiVersion || undefined,
  },
);

export { repos };
