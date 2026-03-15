import { createNotificationService } from "@crm/notifications";

import { createPrivilegedLoginAlertSender } from "~/lib/auth/security/login-alerts";
import { config } from "~/lib/config";
import { db } from "~/lib/db/db";
import { env } from "~/lib/env";
import { createSearchEnrichmentService } from "~/server/client-search/enrichment-service";
import { createClientSearchService } from "~/server/client-search/service";
import { createExtensionService } from "~/server/extension/service";
import { createLeadOpsService } from "~/server/lead-ops/service";
import { createAppNotificationCenter } from "~/server/notifications/app-center-service";
import { createObservabilityService } from "~/server/observability/service";
import { createSalesExportBlobStore } from "~/server/sales/export-blob-store";
import { createSalesExportService } from "~/server/sales/export-service";
import { createSalesRecordsWorkflowService } from "~/server/sales/records-service";
import { createSearchAccessService } from "~/server/search-access/service";
import { createRepositories } from "~/server/shared/registry";
import { createTeamAdminService } from "~/server/team-admin/service";
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
export const clientSearchService = createClientSearchService();
export const searchEnrichmentService = createSearchEnrichmentService(repos);
export const searchAccessService = createSearchAccessService(repos);
export const leadOpsService = createLeadOpsService(repos);
export const teamAdminService = createTeamAdminService(repos);
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
