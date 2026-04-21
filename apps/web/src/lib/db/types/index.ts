import * as core from "./00-core";
import * as auth from "./01-auth";
import * as crm from "./02-crm";
import * as capacity from "./03-capacity";
import * as sales from "./04-sales";
import * as notifications from "./05-notifications";
import * as extensions from "./06-extensions";
import * as search from "./07-search";
import * as platform from "./08-platform";
import * as observability from "./09-observability";
import * as workflow from "./10-workflow";
import * as integration from "./11-integration";
import * as workflowFiles from "./12-workflow-files";

export {
  type BranchesTable,
  type TeamsTable,
  type OrganizationsTable,
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
  type SalesRecordsTable,
  type SalesRecordClientTable,
  type SalesRecordAddressesTable,
  type SalesRecordProductsTable,
  type SalesRecordAttemptsTable,
} from "./04-sales";

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
  type ProductsTable,
  type InventoryItemsTable,
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
  type PipelineLeadsTable,
  type PipelineLeadCommercialInputsTable,
  type PipelineQuotationsTable,
  type PipelineSalesTable,
  type PipelineLeadAssignmentsTable,
  type PipelineHistoryEventsTable,
  type LeadSourcingPoliciesTable,
} from "./10-workflow";

export {
  type PipelineIntegrationJobsTable,
  type PipelineIntegrationImportRowsTable,
  type PipelineIntegrationOutboxNeedsExecutiveInputTable,
  type PipelineIntegrationOutboxReadyForQuotationTable,
} from "./11-integration";

export {
  type WorkflowArtifactsTable,
  type FileAssetsTable,
  type ArtifactFileBindingsTable,
  type ArtifactEventsTable,
  type ArtifactDownloadTokensTable,
} from "./12-workflow-files";

export interface Database {
  branches: core.BranchesTable;
  teams: core.TeamsTable;
  users: crm.UsersTable;
  login_flows: auth.LoginFlowsTable;
  notification_contacts: notifications.NotificationContactsTable;
  notification_preferences: notifications.NotificationPreferencesTable;
  notification_campaigns: notifications.NotificationCampaignsTable;
  notification_recipients: notifications.NotificationRecipientsTable;
  notification_jobs: notifications.NotificationJobsTable;
  notification_deliveries: notifications.NotificationDeliveriesTable;
  app_notifications: notifications.AppNotificationsTable;
  client_search_views: search.ClientSearchViewsTable;
  search_policy_defaults: capacity.SearchPolicyDefaultsTable;
  search_policy_overrides: capacity.SearchPolicyOverridesTable;
  user_sessions: auth.UserSessionsTable;
  request_sessions: auth.RequestSessionsTable;
  action_rate_limit_counters: observability.ActionRateLimitCountersTable;
  auth_throttle_counters: observability.AuthThrottleCountersTable;
  auth_events: observability.AuthEventsTable;
  user_totp_factors: auth.UserTotpFactorsTable;
  user_totp_recovery_codes: auth.UserTotpRecoveryCodesTable;
  user_invites: auth.UserInvitesTable;
  organizations: core.OrganizationsTable;
  contacts: crm.ContactsTable;
  lead_assignments: crm.LeadAssignmentsTable;
  sales_records: sales.SalesRecordsTable;
  sales_record_client: sales.SalesRecordClientTable;
  sales_record_addresses: sales.SalesRecordAddressesTable;
  sales_record_products: sales.SalesRecordProductsTable;
  sales_record_attempts: sales.SalesRecordAttemptsTable;
  lead_policy_defaults: capacity.LeadPolicyDefaultsTable;
  lead_policy_overrides: capacity.LeadPolicyOverridesTable;
  search_capacity_grants: capacity.SearchCapacityGrantsTable;
  search_usage_reservations: capacity.SearchUsageReservationsTable;
  search_usage_commits: capacity.SearchUsageCommitsTable;
  lead_capacity_grants: capacity.LeadCapacityGrantsTable;
  lead_usage_reservations: capacity.LeadUsageReservationsTable;
  lead_usage_commits: capacity.LeadUsageCommitsTable;
  capacity_requests: capacity.CapacityRequestsTable;
  products: platform.ProductsTable;
  interaction_logs: crm.InteractionLogsTable;
  inventory_items: platform.InventoryItemsTable;
  extension_handoffs: extensions.ExtensionHandoffsTable;
  extension_installation_sessions: extensions.ExtensionInstallationSessionsTable;
  extension_runtime_events: extensions.ExtensionRuntimeEventsTable;
  extension_executive_statuses: extensions.ExtensionExecutiveStatusesTable;
  agent_status_logs: observability.AgentStatusLogsTable;
  audit_logs: platform.AuditLogsTable;
  audit_action_policies: platform.AuditActionPoliciesTable;
  action_observations: observability.ActionObservationsTable;
  auth_funnel_events: auth.AuthFunnelEventsTable;
  report_export_jobs: platform.ReportExportJobsTable;
  report_export_downloads: platform.ReportExportDownloadsTable;
  search_enrichment_jobs: search.SearchEnrichmentJobsTable;
  search_enrichment_overlays: search.SearchEnrichmentOverlaysTable;
  search_enrichment_completion_outbox: search.SearchEnrichmentCompletionOutboxTable;
  passkeys: auth.PasskeysTable;
  webauthn_challenges: auth.WebauthnChallengesTable;
  user_oauth_accounts: auth.UserOAuthAccountsTable;
  password_reset_tokens: auth.PasswordResetTokensTable;
  pipeline_leads: workflow.PipelineLeadsTable;
  pipeline_lead_commercial_inputs: workflow.PipelineLeadCommercialInputsTable;
  pipeline_quotations: workflow.PipelineQuotationsTable;
  pipeline_sales: workflow.PipelineSalesTable;
  pipeline_lead_assignments: workflow.PipelineLeadAssignmentsTable;
  pipeline_history_events: workflow.PipelineHistoryEventsTable;
  lead_sourcing_policies: workflow.LeadSourcingPoliciesTable;
  pipeline_integration_jobs: integration.PipelineIntegrationJobsTable;
  pipeline_integration_import_rows: integration.PipelineIntegrationImportRowsTable;
  pipeline_integration_outbox_needs_executive_input: integration.PipelineIntegrationOutboxNeedsExecutiveInputTable;
  pipeline_integration_outbox_ready_for_quotation: integration.PipelineIntegrationOutboxReadyForQuotationTable;
  workflow_artifacts: workflowFiles.WorkflowArtifactsTable;
  file_assets: workflowFiles.FileAssetsTable;
  artifact_file_bindings: workflowFiles.ArtifactFileBindingsTable;
  artifact_events: workflowFiles.ArtifactEventsTable;
  artifact_download_tokens: workflowFiles.ArtifactDownloadTokensTable;
}
