import { db } from "~/lib/db/db";
import { createClientSearchService } from "~/server/client-search/service";
import { createLeadAssignmentService } from "~/server/leads/service";
import { createAppNotificationCenter } from "~/server/notifications/app-center-service";
import { createQuotaService } from "~/server/quota/service";
import { createSalesWorkflowService } from "~/server/sales/service";
import { createRepositories } from "~/server/shared/registry";

const repos = createRepositories(db);

export const appNotificationCenter = createAppNotificationCenter({
  repos: { appNotifications: repos.appNotifications, users: repos.users },
});
export const clientSearchService = createClientSearchService();
export const quotaService = createQuotaService(repos);
export const leadService = createLeadAssignmentService(repos);
export const salesService = createSalesWorkflowService(repos, {
  notifications: appNotificationCenter,
});

export { repos };
