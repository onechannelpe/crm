import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/schema";
import { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import {
  createUserTotpFactorsRepo,
  createUserTotpRecoveryCodesRepo,
} from "~/server/auth/repos-user-totp-factors";
import { createSearchEnrichmentRepo } from "~/server/client-search/repos-enrichment";
import { createClientSearchViewsRepo } from "~/server/client-search/repos-views";
import { createContactsRepo } from "~/server/contacts/repos-contacts";
import { createOrganizationsRepo } from "~/server/contacts/repos-organizations";
import { createInventoryRepo } from "~/server/inventory/repos";
import { createProductsRepo } from "~/server/inventory/repos-products";
import { createLeadAssignmentsRepo } from "~/server/leads/repos";
import { createAppNotificationsRepo } from "~/server/notifications/repos-app-notifications";
import { createNotificationCampaignsRepo } from "~/server/notifications/repos-campaigns";
import { createNotificationContactsRepo } from "~/server/notifications/repos-contacts";
import { createNotificationPreferencesRepo } from "~/server/notifications/repos-preferences";
import { createActionObservationsRepo } from "~/server/observability/repos-action-observations";
import { createQuotaAllocationsRepo } from "~/server/quota/repos";
import { createReportExportRepo } from "~/server/sales/repos-report-exports";
import { createSalesRecordsRepo } from "~/server/sales/repos-sales-records";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createBranchesRepo } from "~/server/users/repos-branches";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import { createUsersRepo } from "~/server/users/repos-users";
import { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

import { createAgentStatusRepo } from "./repos-agent-status";
import { createAuditActionPoliciesRepo } from "./repos-audit-action-policies";
import { createAuditLogsRepo } from "./repos-audit-logs";
import { createInteractionLogsRepo } from "./repos-interaction-logs";

export function createRepositories(db: Kysely<Database>) {
  return {
    users: createUsersRepo(db),
    userInvites: createUserInvitesRepo(db),
    sessions: createSessionRepository(db),
    authEvents: createAuthEventsRepo(db),
    authThrottle: createAuthThrottleRepo(db),
    actionRateLimits: createActionRateLimitsRepo(db),
    userTotpFactors: createUserTotpFactorsRepo(db),
    userTotpRecoveryCodes: createUserTotpRecoveryCodesRepo(db),
    organizations: createOrganizationsRepo(db),
    clientSearchViews: createClientSearchViewsRepo(db),
    searchEnrichment: createSearchEnrichmentRepo(db),
    contacts: createContactsRepo(db),
    leadAssignments: createLeadAssignmentsRepo(db),
    quotaAllocations: createQuotaAllocationsRepo(db),
    reportExportJobs: createReportExportRepo(db),
    salesRecords: createSalesRecordsRepo(db),
    interactionLogs: createInteractionLogsRepo(db),
    products: createProductsRepo(db),
    notificationCampaigns: createNotificationCampaignsRepo(db),
    notificationContacts: createNotificationContactsRepo(db),
    notificationPreferences: createNotificationPreferencesRepo(db),
    appNotifications: createAppNotificationsRepo(db),
    actionObservations: createActionObservationsRepo(db),
    inventory: createInventoryRepo(db),
    auditLogs: createAuditLogsRepo(db),
    auditActionPolicies: createAuditActionPoliciesRepo(db),
    agentStatus: createAgentStatusRepo(db),
    passkeys: createPasskeysRepo(db),
    webauthnChallenges: createWebauthnChallengesRepo(db),
    branches: createBranchesRepo(db),
    teams: createTeamsRepo(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
