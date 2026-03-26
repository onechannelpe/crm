import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createLoginFlowsRepo } from "~/server/auth/repos-login-flows";
import { createOAuthAccountsRepo } from "~/server/auth/repos-oauth-accounts";
import { createPasswordResetTokensRepo } from "~/server/auth/repos-password-reset";
import {
  createUserTotpFactorsRepo,
  createUserTotpRecoveryCodesRepo,
} from "~/server/auth/repos-user-totp-factors";
import { createCapacityRequestsRepo } from "~/server/capacity-admin/repos";
import {
  createLeadPolicyDefaultsRepo,
  createLeadPolicyOverridesRepo,
  createSearchPolicyDefaultsRepo,
  createSearchPolicyOverridesRepo,
} from "~/server/capacity-policy/repos";
import {
  createLeadCapacityGrantsRepo,
  createLeadUsageCommitsRepo,
  createLeadUsageReservationsRepo,
  createSearchCapacityGrantsRepo,
  createSearchUsageCommitsRepo,
  createSearchUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import { createSearchEnrichmentRepo } from "~/server/client-search/repos-enrichment";
import { createLeadAssignmentsRepo } from "~/server/contacts/repos-assignments";
import { createContactsRepo } from "~/server/contacts/repos-contacts";
import { createOrganizationsRepo } from "~/server/contacts/repos-organizations";
import { createExtensionRuntimeRepo } from "~/server/extension/repos";
import { createIntegrationJobRepo } from "~/server/integrations/infrastructure/integration-job-repo";
import { createInventoryRepo } from "~/server/inventory/repos";
import { createProductsRepo } from "~/server/inventory/repos-products";
import { createLeadAssignmentRepo } from "~/server/leads/infrastructure/lead-assignment-repo";
import { createLeadCommercialInputRepo } from "~/server/leads/infrastructure/lead-commercial-input-repo";
import { createLeadRepo } from "~/server/leads/infrastructure/lead-repo";
import { createAppNotificationsRepo } from "~/server/notifications/repos-app-notifications";
import { createNotificationCampaignsRepo } from "~/server/notifications/repos-campaigns";
import { createNotificationContactsRepo } from "~/server/notifications/repos-contacts";
import { createNotificationPreferencesRepo } from "~/server/notifications/repos-preferences";
import { createActionObservationsRepo } from "~/server/observability/repos-action-observations";
import { createAuthFunnelEventsRepo } from "~/server/observability/repos-auth-funnel-events";
import { createQuotationRepo } from "~/server/quotations/infrastructure/quotation-repo";
import { createSaleRepo } from "~/server/sales/infrastructure/sale-repo";
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
    loginFlows: createLoginFlowsRepo(db),
    authThrottle: createAuthThrottleRepo(db),
    actionRateLimits: createActionRateLimitsRepo(db),
    userTotpFactors: createUserTotpFactorsRepo(db),
    userTotpRecoveryCodes: createUserTotpRecoveryCodesRepo(db),
    organizations: createOrganizationsRepo(db),
    searchEnrichment: createSearchEnrichmentRepo(db),
    contacts: createContactsRepo(db),
    leadAssignments: createLeadAssignmentsRepo(db),
    searchPolicyDefaults: createSearchPolicyDefaultsRepo(db),
    searchPolicyOverrides: createSearchPolicyOverridesRepo(db),
    leadPolicyDefaults: createLeadPolicyDefaultsRepo(db),
    leadPolicyOverrides: createLeadPolicyOverridesRepo(db),
    searchCapacityGrants: createSearchCapacityGrantsRepo(db),
    searchUsageReservations: createSearchUsageReservationsRepo(db),
    searchUsageCommits: createSearchUsageCommitsRepo(db),
    leadCapacityGrants: createLeadCapacityGrantsRepo(db),
    leadUsageReservations: createLeadUsageReservationsRepo(db),
    leadUsageCommits: createLeadUsageCommitsRepo(db),
    capacityRequests: createCapacityRequestsRepo(db),
    reportExportJobs: createReportExportRepo(db),
    salesRecords: createSalesRecordsRepo(db),
    interactionLogs: createInteractionLogsRepo(db),
    products: createProductsRepo(db),
    notificationCampaigns: createNotificationCampaignsRepo(db),
    notificationContacts: createNotificationContactsRepo(db),
    notificationPreferences: createNotificationPreferencesRepo(db),
    appNotifications: createAppNotificationsRepo(db),
    actionObservations: createActionObservationsRepo(db),
    authFunnelEvents: createAuthFunnelEventsRepo(db),
    inventory: createInventoryRepo(db),
    extensionRuntime: createExtensionRuntimeRepo(db),
    auditLogs: createAuditLogsRepo(db),
    auditActionPolicies: createAuditActionPoliciesRepo(db),
    agentStatus: createAgentStatusRepo(db),
    passkeys: createPasskeysRepo(db),
    webauthnChallenges: createWebauthnChallengesRepo(db),
    oauthAccounts: createOAuthAccountsRepo(db),
    passwordResetTokens: createPasswordResetTokensRepo(db),
    branches: createBranchesRepo(db),
    teams: createTeamsRepo(db),
    leads: createLeadRepo(db),
    pipelineAssignments: createLeadAssignmentRepo(db),
    leadCommercialInputs: createLeadCommercialInputRepo(db),
    quotations: createQuotationRepo(db),
    leadSales: createSaleRepo(db),
    integrationJobs: createIntegrationJobRepo(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
