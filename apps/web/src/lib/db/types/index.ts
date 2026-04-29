import * as core from "./00-core";
import * as auth from "./01-auth";
import * as crm from "./02-crm";
import * as capacity from "./03-capacity";
import * as notifications from "./05-notifications";
import * as extensions from "./06-extensions";
import * as search from "./07-search";
import * as platform from "./08-platform";
import * as observability from "./09-observability";
import * as workflow from "./10-workflow";
import * as integration from "./11-integration";
import * as workflowFiles from "./12-workflow-files";
import * as negotiation from "./13-negotiation";
import * as saleVenues from "./14-sale-venues";

export type {
  BranchesTable,
  TeamsTable,
  OrganizationsTable,
  BranchSupervisorsTable,
  BackOfficeAssignmentsTable,
} from "./00-core";

export {
  type AuthFunnelSourceValue,
  type AuthFunnelEventNameValue,
  type AuthFunnelScreenValue,
  type AuthFunnelMethodValue,
  type AuthFunnelOutcomeValue,
  type LoginFlowsTable,
  type PasskeysTable,
  type WebauthnChallengesTable,
  type UserOAuthAccountsTable,
  type PasswordResetTokensTable,
  type UserSessionsTable,
  type RequestSessionsTable,
  type UserTotpFactorsTable,
  type UserTotpRecoveryCodesTable,
  type UserInvitesTable,
  type AuthFunnelEventsTable,
} from "./01-auth";

export {
  type ExecutiveCategoryValue,
  type UsersTable,
  type ContactsTable,
  type LeadAssignmentsTable,
  type InteractionLogsTable,
  isExecutiveCategoryValue,
} from "./02-crm";

export {
  type SearchCapacityGrantsTable,
  type SearchUsageReservationsTable,
  type SearchUsageCommitsTable,
  type LeadCapacityGrantsTable,
  type LeadUsageReservationsTable,
  type LeadUsageCommitsTable,
  type CapacityRequestsTable,
  type LeadPolicyDefaultsTable,
  type LeadPolicyOverridesTable,
  type SearchPolicyDefaultsTable,
  type SearchPolicyOverridesTable,
} from "./03-capacity";

export {
  type NotificationContactsTable,
  type NotificationPreferencesTable,
  type NotificationCampaignsTable,
  type NotificationRecipientsTable,
  type NotificationJobsTable,
  type NotificationDeliveriesTable,
  type AppNotificationsTable,
} from "./05-notifications";

export {
  type ExtensionHandoffsTable,
  type ExtensionInstallationSessionsTable,
  type ExtensionRuntimeEventsTable,
  type ExtensionExecutiveStatusesTable,
} from "./06-extensions";

export {
  type ClientSearchViewsTable,
  type SearchEnrichmentJobsTable,
  type SearchEnrichmentOverlaysTable,
  type SearchEnrichmentCompletionOutboxTable,
} from "./07-search";

export {
  type AuditLogsTable,
  type AuditActionPoliciesTable,
  type ReportExportJobsTable,
  type ReportExportDownloadsTable,
} from "./08-platform";

export {
  type ActionObservationsTable,
  type AgentStatusLogsTable,
  type ActionRateLimitCountersTable,
  type AuthThrottleCountersTable,
  type AuthEventsTable,
} from "./09-observability";

export {
  type WorkflowLeadsTable,
  type WorkflowLeadCommercialInputsTable,
  type WorkflowQuotationsTable,
  type WorkflowSalesTable,
  type WorkflowLeadAssignmentsTable,
  type WorkflowLeadFavoritesTable,
  type WorkflowHistoryEventsTable,
  type WorkflowAuditLogsTable,
  type LeadSourcingPoliciesTable,
} from "./10-workflow";

export {
  type WorkflowIntegrationJobsTable,
  type WorkflowIntegrationImportRowsTable,
  type WorkflowIntegrationOutboxNeedsExecutiveInputTable,
  type WorkflowIntegrationOutboxReadyForQuotationTable,
} from "./11-integration";

export {
  type WorkflowArtifactsTable,
  type FileAssetsTable,
  type ArtifactFileBindingsTable,
  type ArtifactEventsTable,
  type ArtifactDownloadTokensTable,
  type WorkflowSaleProofFilesTable,
} from "./12-workflow-files";

export {
  type WorkflowNegotiationRequestsTable,
  type WorkflowNegotiationFilesTable,
} from "./13-negotiation";

export { type WorkflowSaleVenuesTable } from "./14-sale-venues";

export interface Database {
  // 00-core
  branches: core.BranchesTable;
  teams: core.TeamsTable;
  organizations: core.OrganizationsTable;
  branch_supervisors: core.BranchSupervisorsTable;
  back_office_assignments: core.BackOfficeAssignmentsTable;

  // 01-auth
  login_flows: auth.LoginFlowsTable;
  passkeys: auth.PasskeysTable;
  webauthn_challenges: auth.WebauthnChallengesTable;
  user_oauth_accounts: auth.UserOAuthAccountsTable;
  password_reset_tokens: auth.PasswordResetTokensTable;
  user_sessions: auth.UserSessionsTable;
  request_sessions: auth.RequestSessionsTable;
  user_totp_factors: auth.UserTotpFactorsTable;
  user_totp_recovery_codes: auth.UserTotpRecoveryCodesTable;
  user_invites: auth.UserInvitesTable;
  auth_funnel_events: auth.AuthFunnelEventsTable;

  // 02-crm
  users: crm.UsersTable;
  contacts: crm.ContactsTable;
  lead_assignments: crm.LeadAssignmentsTable;
  interaction_logs: crm.InteractionLogsTable;

  // 03-capacity
  search_capacity_grants: capacity.SearchCapacityGrantsTable;
  search_usage_reservations: capacity.SearchUsageReservationsTable;
  search_usage_commits: capacity.SearchUsageCommitsTable;
  lead_capacity_grants: capacity.LeadCapacityGrantsTable;
  lead_usage_reservations: capacity.LeadUsageReservationsTable;
  lead_usage_commits: capacity.LeadUsageCommitsTable;
  capacity_requests: capacity.CapacityRequestsTable;
  lead_policy_defaults: capacity.LeadPolicyDefaultsTable;
  lead_policy_overrides: capacity.LeadPolicyOverridesTable;
  search_policy_defaults: capacity.SearchPolicyDefaultsTable;
  search_policy_overrides: capacity.SearchPolicyOverridesTable;

  // 05-notifications
  notification_contacts: notifications.NotificationContactsTable;
  notification_preferences: notifications.NotificationPreferencesTable;
  notification_campaigns: notifications.NotificationCampaignsTable;
  notification_recipients: notifications.NotificationRecipientsTable;
  notification_jobs: notifications.NotificationJobsTable;
  notification_deliveries: notifications.NotificationDeliveriesTable;
  app_notifications: notifications.AppNotificationsTable;

  // 06-extensions
  extension_handoffs: extensions.ExtensionHandoffsTable;
  extension_installation_sessions: extensions.ExtensionInstallationSessionsTable;
  extension_runtime_events: extensions.ExtensionRuntimeEventsTable;
  extension_executive_statuses: extensions.ExtensionExecutiveStatusesTable;

  // 07-search
  client_search_views: search.ClientSearchViewsTable;
  search_enrichment_jobs: search.SearchEnrichmentJobsTable;
  search_enrichment_overlays: search.SearchEnrichmentOverlaysTable;
  search_enrichment_completion_outbox: search.SearchEnrichmentCompletionOutboxTable;

  // 08-platform
  audit_logs: platform.AuditLogsTable;
  audit_action_policies: platform.AuditActionPoliciesTable;
  report_export_jobs: platform.ReportExportJobsTable;
  report_export_downloads: platform.ReportExportDownloadsTable;

  // 09-observability
  action_observations: observability.ActionObservationsTable;
  agent_status_logs: observability.AgentStatusLogsTable;
  action_rate_limit_counters: observability.ActionRateLimitCountersTable;
  auth_throttle_counters: observability.AuthThrottleCountersTable;
  auth_events: observability.AuthEventsTable;

  // 10-workflow
  workflow_leads: workflow.WorkflowLeadsTable;
  workflow_lead_commercial_inputs: workflow.WorkflowLeadCommercialInputsTable;
  workflow_quotations: workflow.WorkflowQuotationsTable;
  workflow_sales: workflow.WorkflowSalesTable;
  workflow_lead_assignments: workflow.WorkflowLeadAssignmentsTable;
  workflow_lead_favorites: workflow.WorkflowLeadFavoritesTable;
  workflow_history_events: workflow.WorkflowHistoryEventsTable;
  workflow_audit_logs: workflow.WorkflowAuditLogsTable;
  lead_sourcing_policies: workflow.LeadSourcingPoliciesTable;

  // 11-integration
  workflow_integration_jobs: integration.WorkflowIntegrationJobsTable;
  workflow_integration_import_rows: integration.WorkflowIntegrationImportRowsTable;
  workflow_integration_outbox_needs_executive_input: integration.WorkflowIntegrationOutboxNeedsExecutiveInputTable;
  workflow_integration_outbox_ready_for_quotation: integration.WorkflowIntegrationOutboxReadyForQuotationTable;

  // 12-workflow-files
  workflow_artifacts: workflowFiles.WorkflowArtifactsTable;
  file_assets: workflowFiles.FileAssetsTable;
  artifact_file_bindings: workflowFiles.ArtifactFileBindingsTable;
  artifact_events: workflowFiles.ArtifactEventsTable;
  artifact_download_tokens: workflowFiles.ArtifactDownloadTokensTable;
  workflow_sale_proof_files: workflowFiles.WorkflowSaleProofFilesTable;

  // 13-negotiation
  workflow_negotiation_requests: negotiation.WorkflowNegotiationRequestsTable;
  workflow_negotiation_files: negotiation.WorkflowNegotiationFilesTable;

  // 14-sale-venues
  workflow_sale_venues: saleVenues.WorkflowSaleVenuesTable;
  workflow_sale_venue_accounts: saleVenues.WorkflowSaleVenueAccountsTable;
}
