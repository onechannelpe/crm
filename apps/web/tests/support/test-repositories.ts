import type { Kysely } from "kysely";

import type { Database } from "../../src/lib/db/types";
import { createAuthEventsRepo } from "../../src/server/auth/repos-auth-events";
import { createAuthThrottleRepo } from "../../src/server/auth/repos-auth-throttle";
import { createLoginFlowsRepo } from "../../src/server/auth/repos-login-flows";
import { createOAuthAccountsRepo } from "../../src/server/auth/repos-oauth-accounts";
import { createPasswordResetTokensRepo } from "../../src/server/auth/repos-password-reset";
import {
  createUserTotpFactorsRepo,
  createUserTotpRecoveryCodesRepo,
} from "../../src/server/auth/repos-user-totp-factors";
import {
  createLeadCapacityGrantsRepo,
  createLeadUsageCommitsRepo,
  createLeadUsageReservationsRepo,
  createSearchCapacityGrantsRepo,
  createSearchUsageCommitsRepo,
  createSearchUsageReservationsRepo,
} from "../../src/server/capacity-usage/repos";
import { createCapacityRequestsRepo } from "../../src/server/capacity/infrastructure/capacity-requests-repo";
import {
  createLeadPolicyDefaultsRepo,
  createLeadPolicyOverridesRepo,
  createSearchPolicyDefaultsRepo,
  createSearchPolicyOverridesRepo,
} from "../../src/server/capacity/infrastructure/policy-repos";
import { createSearchEnrichmentRepo } from "../../src/server/client-search/repository";
import { createContactAssignmentsRepo } from "../../src/server/contacts/repos-assignments";
import { createContactsRepo } from "../../src/server/contacts/repos-contacts";
import { createOrganizationsRepo } from "../../src/server/contacts/repos-organizations";
import { createExtensionRuntimeRepo } from "../../src/server/extension/repos";
import { createIntegrationJobRepo } from "../../src/server/integrations/infrastructure/integration-job-repo";
import { createInventoryRepo } from "../../src/server/inventory/repos";
import { createProductsRepo } from "../../src/server/inventory/repos-products";
import { createAppNotificationRepo } from "../../src/server/notifications/repos/app-notification";
import { createNotificationCampaignRepo } from "../../src/server/notifications/repos/campaign";
import { createNotificationContactRepo } from "../../src/server/notifications/repos/contact";
import { createNotificationPreferenceRepo } from "../../src/server/notifications/repos/preference";
import { createActionObservationsRepo } from "../../src/server/observability/repos-action-observations";
import { createAuthFunnelEventsRepo } from "../../src/server/observability/repos-auth-funnel-events";
import { createReportExportRepo } from "../../src/server/sales/repos-report-exports";
import { createSalesRecordsRepo } from "../../src/server/sales/repos-sales-records";
import { createActionRateLimitsRepo } from "../../src/server/security/repos-action-rate-limits";
import { createRequestSessionsRepo } from "../../src/server/security/repos-request-sessions";
import { createSessionRepository } from "../../src/server/sessions/repos-sessions";
import { createAgentStatusRepo } from "../../src/server/shared/repos-agent-status";
import { createAuditActionPoliciesRepo } from "../../src/server/shared/repos-audit-action-policies";
import { createAuditLogsRepo } from "../../src/server/shared/repos-audit-logs";
import { createInteractionLogsRepo } from "../../src/server/shared/repos-interaction-logs";
import { createBranchesRepo } from "../../src/server/users/repos-branches";
import { createPasskeysRepo } from "../../src/server/users/repos-passkeys";
import { createTeamsRepo } from "../../src/server/users/repos-teams";
import { createUserInvitesRepo } from "../../src/server/users/repos-user-invites";
import { createUsersRepo } from "../../src/server/users/repos-users";
import { createWebauthnChallengesRepo } from "../../src/server/users/repos-webauthn-challenges";

export function createTestRepositories(db: Kysely<Database>) {
  return {
    users: createUsersRepo(db),
    userInvites: createUserInvitesRepo(db),
    sessions: createSessionRepository(db),
    requestSessions: createRequestSessionsRepo(db),
    authEvents: createAuthEventsRepo(db),
    loginFlows: createLoginFlowsRepo(db),
    authThrottle: createAuthThrottleRepo(db),
    actionRateLimits: createActionRateLimitsRepo(db),
    userTotpFactors: createUserTotpFactorsRepo(db),
    userTotpRecoveryCodes: createUserTotpRecoveryCodesRepo(db),
    organizations: createOrganizationsRepo(db),
    searchEnrichment: createSearchEnrichmentRepo(db),
    contacts: createContactsRepo(db),
    contactAssignments: createContactAssignmentsRepo(db),
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
    notificationCampaigns: createNotificationCampaignRepo(db),
    notificationContacts: createNotificationContactRepo(db),
    notificationPreferences: createNotificationPreferenceRepo(db),
    appNotifications: createAppNotificationRepo(db),
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
    integrationJobs: createIntegrationJobRepo(db),
  };
}

export type TestRepositories = ReturnType<typeof createTestRepositories>;
