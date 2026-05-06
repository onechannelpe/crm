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
import {
  createLeadCapacityGrantsRepo,
  createLeadUsageCommitsRepo,
  createLeadUsageReservationsRepo,
  createSearchCapacityGrantsRepo,
  createSearchUsageCommitsRepo,
  createSearchUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import { createCapacityRequestsRepo } from "~/server/capacity/infrastructure/capacity-requests-repo";
import {
  createLeadPolicyDefaultsRepo,
  createLeadPolicyOverridesRepo,
  createSearchPolicyDefaultsRepo,
  createSearchPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import { createContactsRepo } from "~/server/contacts/repos-contacts";
import { createOrganizationsRepo } from "~/server/contacts/repos-organizations";
import { createExtensionRuntimeRepo } from "~/server/extension/repos";
import { createIntegrationJobRepo } from "~/server/integrations/infrastructure/integration-job-repo";
import { createAppNotificationRepo } from "~/server/notifications/repos/app-notification";
import { createNotificationCampaignRepo } from "~/server/notifications/repos/campaign";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import { createNotificationPreferenceRepo } from "~/server/notifications/repos/preference";
import { createActionObservationsRepo } from "~/server/observability/repos-action-observations";
import { createAuthFunnelEventsRepo } from "~/server/observability/repos-auth-funnel-events";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import { createRequestSessionsRepo } from "~/server/security/repos-request-sessions";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createAgentStatusRepo } from "~/server/shared/repos-agent-status";
import { createAuditActionPoliciesRepo } from "~/server/shared/repos-audit-action-policies";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createInteractionLogsRepo } from "~/server/shared/repos-interaction-logs";
import { createBranchesRepo } from "~/server/users/repos-branches";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import { createUsersRepo } from "~/server/users/repos-users";
import { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

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
    interactionLogs: createInteractionLogsRepo(db),
    notificationCampaigns: createNotificationCampaignRepo(db),
    userChannelAddresses: createUserChannelAddressRepo(db),
    notificationPreferences: createNotificationPreferenceRepo(db),
    appNotifications: createAppNotificationRepo(db),
    actionObservations: createActionObservationsRepo(db),
    authFunnelEvents: createAuthFunnelEventsRepo(db),
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
