import type { ColumnType, Generated } from "kysely";

type AuthFunnelSourceValue = "client" | "server";
type AuthFunnelEventNameValue =
  | "screen_viewed"
  | "password_result"
  | "passkey_start_result"
  | "totp_result"
  | "passkey_result";
type AuthFunnelScreenValue =
  | "login"
  | "login_user"
  | "login_verify"
  | "login_passkey"
  | "reset_password";
type AuthFunnelMethodValue =
  | "password"
  | "password_totp"
  | "passkey"
  | "google";
type AuthFunnelOutcomeValue =
  | "viewed"
  | "failed"
  | "succeeded"
  | "started"
  | "totp_required"
  | "passkey_required";
export interface BranchesTable {
  id: Generated<number>;
  name: string;
  created_at: number;
}

export interface TeamsTable {
  id: Generated<number>;
  branch_id: number;
  name: string;
  supervisor_id: number | null;
  created_at: number;
}

export interface UsersTable {
  id: Generated<number>;
  branch_id: number;
  team_id: number | null;
  username: string;
  email: string;
  password_hash: string;
  names: string;
  first_surname: string;
  second_surname: string;
  expires_at: number | null;
  expiry_notified_at: number | null;
  phone_e164: string | null;
  avatar_storage_key: string | null;
  avatar_mime_type: string | null;
  avatar_updated_at: number | null;
  avatar_version: ColumnType<number, number | undefined, number>;
  onboarding_completed_at: number | null;
  role:
    | "executive"
    | "supervisor"
    | "back_office"
    | "sales_manager"
    | "logistics"
    | "hr"
    | "admin"
    | "superuser";
  executive_category: ExecutiveCategoryValue | null;
  is_active: number;
  created_at: number;
}

export interface LoginFlowsTable {
  id: Generated<number>;
  identifier: string;
  primary_auth_method: "password" | "google" | "passkey";
  user_id: number | null;
  challenge_id: number | null;
  state: "totp" | "passkey";
  expires_at: number;
  created_at: number;
  updated_at: number;
}

export interface NotificationContactsTable {
  id: Generated<number>;
  user_id: number;
  channel: "email" | "whatsapp";
  address: string;
  is_primary: number;
  is_verified: number;
  verified_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface NotificationPreferencesTable {
  id: Generated<number>;
  user_id: number;
  event_type: string;
  channel: "email" | "whatsapp";
  is_enabled: number;
  created_at: number;
  updated_at: number;
}

export interface NotificationCampaignsTable {
  id: Generated<number>;
  type: "security_event" | "broadcast";
  event_type: string;
  audience_type: "user" | "role" | "global";
  audience_ref: string | null;
  title: string | null;
  body_text: string;
  created_by_user_id: number | null;
  status: "queued" | "processing" | "completed" | "failed";
  scheduled_at: number | null;
  created_at: number;
  processed_at: number | null;
}

export interface NotificationRecipientsTable {
  id: Generated<number>;
  campaign_id: number;
  user_id: number | null;
  channel: "email" | "whatsapp";
  address: string;
  status: "pending" | "sent" | "failed" | "skipped";
  status_reason: string | null;
  created_at: number;
  sent_at: number | null;
  failed_at: number | null;
}

export interface NotificationJobsTable {
  id: Generated<number>;
  recipient_id: number;
  status: "pending" | "leased" | "sent" | "failed";
  attempt_count: number;
  available_at: number;
  lease_until: number | null;
  last_error: string | null;
  created_at: number;
  updated_at: number;
}

export interface NotificationDeliveriesTable {
  id: Generated<number>;
  recipient_id: number;
  provider: "resend" | "whatsapp_cloud";
  provider_message_id: string | null;
  status: "sent" | "failed";
  error_code: string | null;
  error_message: string | null;
  latency_ms: number | null;
  created_at: number;
}

export interface AppNotificationsTable {
  id: Generated<number>;
  user_id: number;
  event_type: string;
  priority: "high" | "normal" | "low";
  title: string;
  body_text: string;
  action_url: string | null;
  dedupe_key: string | null;
  metadata_json: string | null;
  created_at: number;
  read_at: number | null;
}

export interface ClientSearchViewsTable {
  id: Generated<number>;
  user_id: number;
  name: string;
  search_type:
    | "dni"
    | "ruc"
    | "phone"
    | "person_name"
    | "company_name"
    | "phone_enriched";
  query_value: string;
  limit_value: number;
  is_default: number;
  created_at: number;
  updated_at: number;
}

export interface SearchPolicyDefaultsTable {
  id: Generated<number>;
  scope_type: "branch" | "team";
  scope_id: number;
  period_type: "month";
  search_limit: number;
  created_at: number;
  updated_at: number;
}

export interface SearchPolicyOverridesTable {
  id: Generated<number>;
  user_id: number;
  search_limit: number;
  effective_from: number;
  expires_at: number | null;
  set_by_user_id: number;
  created_at: number;
}

export interface OrganizationsTable {
  id: Generated<number>;
  ruc: string;
  name: string;
  locked_branch_id: number | null;
  locked_at: number | null;
  locked_by_user_id: number | null;
  created_at: number;
}

export interface ContactsTable {
  id: Generated<number>;
  organization_id: number;
  dni: string;
  name: string;
  phone_primary: string | null;
  phone_secondary: string | null;
  last_contacted_at: number | null;
  last_contacted_by_user_id: number | null;
  cooldown_until: number | null;
  created_at: number;
}

export interface LeadAssignmentsTable {
  id: Generated<number>;
  user_id: number;
  contact_id: number;
  assigned_at: number;
  expires_at: number;
  status: "active" | "completed" | "expired";
}

export interface SalesRecordsTable {
  id: Generated<number>;
  source: "lead_assignment" | "manual";
  status:
    | "draft"
    | "submitted_for_confirmation"
    | "confirmed"
    | "rejected"
    | "cancelled";
  executive_user_id: number;
  lead_assignment_id: number | null;
  branch_id: number;
  submitted_at: number | null;
  confirmed_at: number | null;
  rejected_at: number | null;
  cancelled_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface SalesRecordClientTable {
  sales_record_id: number;
  ruc: string | null;
  company_name: string | null;
  contact_name: string | null;
  dni: string | null;
  phones_json: string;
  engine_match_id: string | null;
  completeness_score: number;
  created_at: number;
  updated_at: number;
}

export interface SalesRecordAddressesTable {
  id: Generated<number>;
  sales_record_id: number;
  address_type: "installation" | "billing" | "reference";
  full_text: string;
  department: string | null;
  province: string | null;
  district: string | null;
  ubigeo: string | null;
  latitude: number | null;
  longitude: number | null;
  is_primary: number;
  created_at: number;
  updated_at: number;
}

export interface SalesRecordProductsTable {
  id: Generated<number>;
  sales_record_id: number;
  product_id: number;
  product_name_snapshot: string;
  category_snapshot: string;
  subtype_snapshot: string | null;
  quantity: number;
  unit_price_snapshot: number | null;
  created_at: number;
}

export interface SalesRecordAttemptsTable {
  id: Generated<number>;
  sales_record_id: number;
  reviewer_user_id: number;
  outcome:
    | "no_answer"
    | "callback_scheduled"
    | "validated"
    | "invalid_data"
    | "rejected";
  notes: string | null;
  next_attempt_at: number | null;
  created_at: number;
}

export interface LeadPolicyDefaultsTable {
  id: Generated<number>;
  scope_type: "branch" | "team";
  scope_id: number;
  active_buffer_target: number;
  daily_refill_limit: number;
  created_at: number;
  updated_at: number;
}

export interface LeadPolicyOverridesTable {
  id: Generated<number>;
  user_id: number;
  active_buffer_target: number;
  daily_refill_limit: number;
  effective_from: number;
  expires_at: number | null;
  set_by_user_id: number;
  created_at: number;
}

export interface SearchCapacityGrantsTable {
  id: string;
  user_id: number;
  amount: number;
  reason: string;
  actor_user_id: number;
  created_at: number;
}

export interface SearchUsageReservationsTable {
  id: string;
  user_id: number;
  amount: number;
  status: "pending" | "committed" | "cancelled" | "expired";
  reason: string;
  created_at: number;
  updated_at: number;
}

export interface SearchUsageCommitsTable {
  id: string;
  reservation_id: string;
  amount: number;
  created_at: number;
}

export interface LeadCapacityGrantsTable {
  id: string;
  user_id: number;
  amount: number;
  reason: string;
  actor_user_id: number;
  created_at: number;
}

export interface LeadUsageReservationsTable {
  id: string;
  user_id: number;
  amount: number;
  status: "pending" | "committed" | "cancelled" | "expired";
  reason: string;
  created_at: number;
  updated_at: number;
}

export interface LeadUsageCommitsTable {
  id: string;
  reservation_id: string;
  amount: number;
  created_at: number;
}

export interface CapacityRequestsTable {
  id: Generated<number>;
  user_id: number;
  kind: "search_extra" | "lead_refill_extra";
  status: "pending" | "approved" | "rejected" | "canceled";
  requested_amount: number;
  reason: string;
  decision_note: string | null;
  reviewer_user_id: number | null;
  created_at: number;
  updated_at: number;
  decided_at: number | null;
}

export interface ProductsTable {
  id: Generated<number>;
  name: string;
  category: string;
  subtype: string | null;
  price: number;
  is_active: number;
}

export interface InteractionLogsTable {
  id: Generated<number>;
  contact_id: number;
  user_id: number;
  outcome: string;
  notes: string | null;
  duration_seconds: number | null;
  created_at: number;
}

export interface InventoryItemsTable {
  id: Generated<number>;
  product_id: number;
  serial_number: string;
  status: "available" | "reserved" | "sold";
  created_at: number;
}

export interface ExtensionHandoffsTable {
  jti: string;
  user_id: number;
  branch_id: number;
  auth_session_id: string;
  assignment_id: number;
  origin: string;
  installation_id: string | null;
  installation_session_jti: string | null;
  issued_at: number;
  expires_at: number;
  consumed_at: number | null;
}

export interface ExtensionInstallationSessionsTable {
  jti: string;
  user_id: number;
  branch_id: number;
  auth_session_id: string;
  installation_id: string;
  refresh_token_hash: string;
  issued_at: number;
  expires_at: number;
  revoked_at: number | null;
  last_seen_at: number | null;
  refreshed_at: number | null;
}

export interface ExtensionRuntimeEventsTable {
  id: string;
  sequence: number;
  user_id: number;
  branch_id: number;
  assignment_id: number | null;
  contact_id: number | null;
  call_session_id: string | null;
  type:
    | "executive.presence"
    | "executive.heartbeat"
    | "call.lifecycle"
    | "call.metric"
    | "recording.completed"
    | "recording.chunk";
  payload_json: string;
  created_at: number;
  received_at: number;
}

export interface ExtensionExecutiveStatusesTable {
  user_id: number;
  branch_id: number;
  assignment_id: number | null;
  contact_id: number | null;
  call_session_id: string | null;
  presence_status:
    | "idle"
    | "ready"
    | "dialing"
    | "active"
    | "wrap_up"
    | "offline"
    | null;
  presence_updated_at: number | null;
  sync_health: "ok" | "stale" | "reauth_required";
  sync_updated_at: number | null;
  source_event_id: string | null;
  source_event_sequence: number | null;
}

export interface AgentStatusLogsTable {
  id: Generated<number>;
  user_id: number;
  status:
    | "available"
    | "feedback"
    | "break"
    | "services"
    | "training"
    | "unavailable";
  latitude: number;
  longitude: number;
  comment: string | null;
  started_at: number;
  ended_at: number | null;
}

export interface AuditLogsTable {
  id: Generated<number>;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  changes: string | null;
  created_at: number;
}

export interface AuditActionPoliciesTable {
  action: string;
  risk_level: "high" | "medium" | "low";
  is_active: number;
  is_protected: number;
  updated_by_user_id: number | null;
  created_at: number;
  updated_at: number;
}

export interface ActionObservationsTable {
  id: Generated<number>;
  trace_id: string;
  request_id: string;
  route_path: string | null;
  http_method: string | null;
  action_name: string;
  actor_user_id: number | null;
  actor_role: UsersTable["role"] | null;
  status: "ok" | "error";
  duration_ms: number;
  error_code: string | null;
  error_category:
    | "none"
    | "validation"
    | "authorization"
    | "conflict"
    | "not_found"
    | "rate_limit"
    | "internal";
  public_error: string | null;
  is_sensitive: number;
  input_summary: string | null;
  created_at: number;
}

export interface AuthFunnelEventsTable {
  id: Generated<number>;
  trace_id: string;
  request_id: string;
  route_path: string | null;
  source: AuthFunnelSourceValue;
  event_name: AuthFunnelEventNameValue;
  screen: AuthFunnelScreenValue | null;
  method: AuthFunnelMethodValue | null;
  outcome: AuthFunnelOutcomeValue;
  code: string | null;
  created_at: number;
}

export interface ReportExportJobsTable {
  id: Generated<number>;
  requested_by_user_id: number;
  branch_id: number;
  format: "csv" | "xlsx";
  filters_json: string;
  status: "queued" | "running" | "completed" | "failed" | "expired";
  rows_count: number | null;
  file_storage_key: string | null;
  file_sha256: string | null;
  error_message: string | null;
  requested_at: number;
  completed_at: number | null;
  expires_at: number | null;
  lease_owner: string | null;
  lease_until: number | null;
  attempt_count: number;
  max_attempts: number;
  available_at: number | null;
}

export interface ReportExportDownloadsTable {
  id: Generated<number>;
  export_job_id: number;
  downloaded_by_user_id: number;
  downloaded_at: number;
  ip_hash: string | null;
  user_agent_hash: string | null;
}

export interface SearchEnrichmentJobsTable {
  id: Generated<number>;
  document_type: "dni" | "ruc";
  document_value: string;
  status: "queued" | "running" | "completed" | "failed";
  requested_by_user_id: number;
  requested_at: number;
  completed_at: number | null;
  lease_owner: string | null;
  lease_until: number | null;
  attempt_count: number;
  max_attempts: number;
  available_at: number | null;
  last_error: string | null;
}

export interface SearchEnrichmentOverlaysTable {
  document_type: "dni" | "ruc";
  document_value: string;
  full_name: string | null;
  legal_name: string | null;
  source: "sunat";
  confidence: number;
  fetched_at: number;
  expires_at: number;
  payload_json: string;
}

export interface PasskeysTable {
  id: string;
  user_id: number;
  public_key: string;
  counter: number;
  transports: string | null;
  created_at: number;
  last_used_at: number | null;
}

export interface WebauthnChallengesTable {
  id: Generated<number>;
  user_id: number | null;
  type: string;
  challenge: string;
  expires_at: number;
  created_at: number;
}

export interface UserOAuthAccountsTable {
  id: Generated<number>;
  user_id: number;
  provider: string;
  provider_user_id: string;
  email: string;
  created_at: number;
}

export interface PasswordResetTokensTable {
  id: Generated<number>;
  user_id: number;
  token_hash: string;
  expires_at: number;
  used_at: number | null;
  created_at: number;
}

export interface UserSessionsTable {
  id: string;
  user_id: number;
  branch_id: number;
  role: UsersTable["role"];
  session_class: "pre_auth" | "app";
  primary_auth_method: "password" | "google" | "passkey";
  strong_auth_method: "totp" | "passkey" | "federated" | null;
  strong_auth_at: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: number;
  last_activity: number;
  expires_at: number;
}

export interface RequestSessionsTable {
  id: string;
  csrf_token: string;
  created_at: number;
  last_activity: number;
  expires_at: number;
}

export interface ActionRateLimitCountersTable {
  id: Generated<number>;
  key_hash: string;
  window_started_at: number;
  request_count: number;
  updated_at: number;
}

export interface AuthThrottleCountersTable {
  id: Generated<number>;
  scope: "ip" | "account" | "ip_account";
  key_hash: string;
  window_started_at: number;
  failure_count: number;
  blocked_until: number | null;
  updated_at: number;
}

export interface AuthEventsTable {
  id: Generated<number>;
  user_id: number | null;
  method: "password" | "passkey" | "totp";
  stage: "login" | "challenge" | "verify" | "recovery";
  outcome: "success" | "failure" | "throttled";
  reason: string | null;
  identifier_hash: string;
  ip_hash: string;
  created_at: number;
}

export interface UserTotpFactorsTable {
  id: Generated<number>;
  user_id: number;
  secret_encrypted: string;
  is_enabled: number;
  created_at: number;
  updated_at: number;
  enabled_at: number | null;
}

export interface UserTotpRecoveryCodesTable {
  id: Generated<number>;
  user_id: number;
  code_hash: string;
  used_at: number | null;
  created_at: number;
}

export interface UserInvitesTable {
  id: Generated<number>;
  user_id: number;
  branch_id: number;
  email: string;
  role: UsersTable["role"];
  token_hash: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: number;
  created_by_user_id: number;
  accepted_at: number | null;
  revoked_at: number | null;
  created_at: number;
  sent_at: number | null;
}

export type ExecutiveCategoryValue = "elite" | "corporativa";

export function isExecutiveCategoryValue(
  value: string,
): value is ExecutiveCategoryValue {
  return value === "elite" || value === "corporativa";
}

export interface PipelineLeadsTable {
  id: Generated<number>;
  ruc: string;
  razon_social: string | null;
  address: string | null;
  executive_id: number;
  stage:
    | "PENDING_EXTERNAL_REVIEW"
    | "REJECTED_BY_STATUS"
    | "NEEDS_EXECUTIVE_INPUT"
    | "READY_FOR_QUOTATION"
    | "QUOTED"
    | "READY_FOR_SALE"
    | "CONVERTED";
  status: "DISPONIBLE" | "SIN RESULTADO" | "CARTERIZADO" | "STOCK" | null;
  prioridad: "P1" | "P2" | "SIN RESULTADO" | null;
  engine_company_name: string | null;
  engine_address: string | null;
  engine_fetched_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface PipelineLeadCommercialInputsTable {
  lead_id: number;
  proveedor_actual: string | null;
  tasa_actual: number | null;
  gpv: number | null;
  ticket: number | null;
  abono: number | null;
  cantidad_pos: number | null;
  updated_at: number;
  updated_by: number;
}

export interface PipelineQuotationsTable {
  id: Generated<number>;
  lead_id: number;
  payback_pricing: number;
  tarifa_debito: number;
  tarifa_credito: number;
  tarifa_foraneo: number;
  fee: number;
  moneda: "PEN" | "USD";
  version: number;
  created_at: number;
  created_by: number;
}

export interface PipelineSalesTable {
  id: Generated<number>;
  lead_id: number;
  executive_id: number;
  proveedor_actual: string;
  tasa_actual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidad_pos: number;
  banco: string;
  nro_cuenta: string;
  cci: string | null;
  created_at: number;
}

export interface PipelineLeadAssignmentsTable {
  id: Generated<number>;
  lead_id: number;
  executive_id: number;
  assigned_by: number;
  is_active: number;
  assigned_at: number;
}

export interface PipelineHistoryEventsTable {
  id: Generated<number>;
  lead_id: number;
  event_type:
    | "lead_registered"
    | "lead_status_updated"
    | "lead_priority_updated"
    | "lead_reviewed"
    | "workflow_stage_changed"
    | "lead_assigned"
    | "lead_reassigned"
    | "commercial_input_completed"
    | "quotation_created"
    | "sale_approved"
    | "sale_created"
    | "call_logged"
    | "note_added";
  actor_user_id: number | null;
  subject_user_id: number | null;
  payload_json: string | null;
  occurred_at: number;
}

export interface LeadSourcingPoliciesTable {
  branch_id: number;
  engine_assignment_enabled: number;
  updated_at: number;
  updated_by_user_id: number;
}

export interface PipelineIntegrationJobsTable {
  id: Generated<number>;
  type: "export" | "import_status" | "import_prioridad";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  requested_by_user_id: number;
  file_path: string | null;
  error_message: string | null;
  rows_total: number | null;
  rows_applied: number | null;
  rows_failed: number | null;
  results_json: string | null;
  lease_owner: string | null;
  lease_until: number | null;
  attempt_count: ColumnType<number, number | undefined, number>;
  max_attempts: number;
  available_at: number | null;
  created_at: number;
  completed_at: number | null;
}

export interface PipelineIntegrationImportRowsTable {
  id: Generated<number>;
  integration_job_id: number;
  row_number: number;
  type: "import_status" | "import_prioridad";
  ruc: string;
  status_value: string | null;
  prioridad_value: string | null;
  state: "staged" | "applied" | "failed";
  lead_id: number | null;
  failure_reason: string | null;
  created_at: number;
  applied_at: number | null;
}

export interface PipelineIntegrationOutboxNeedsExecutiveInputTable {
  id: Generated<number>;
  lead_id: number;
  ruc: string;
  executive_id: number;
  status: "pending" | "processing" | "completed" | "failed";
  attempt_count: ColumnType<number, number | undefined, number>;
  max_attempts: ColumnType<number, number | undefined, number>;
  available_at: number;
  lease_owner: string | null;
  lease_until: number | null;
  error_message: string | null;
  created_at: number;
  processed_at: number | null;
}

export interface PipelineIntegrationOutboxReadyForQuotationTable {
  id: Generated<number>;
  lead_id: number;
  ruc: string;
  branch_id: number;
  status: "pending" | "processing" | "completed" | "failed";
  attempt_count: ColumnType<number, number | undefined, number>;
  max_attempts: ColumnType<number, number | undefined, number>;
  available_at: number;
  lease_owner: string | null;
  lease_until: number | null;
  error_message: string | null;
  created_at: number;
  processed_at: number | null;
}

export interface Database {
  branches: BranchesTable;
  teams: TeamsTable;
  users: UsersTable;
  login_flows: LoginFlowsTable;
  notification_contacts: NotificationContactsTable;
  notification_preferences: NotificationPreferencesTable;
  notification_campaigns: NotificationCampaignsTable;
  notification_recipients: NotificationRecipientsTable;
  notification_jobs: NotificationJobsTable;
  notification_deliveries: NotificationDeliveriesTable;
  app_notifications: AppNotificationsTable;
  client_search_views: ClientSearchViewsTable;
  search_policy_defaults: SearchPolicyDefaultsTable;
  search_policy_overrides: SearchPolicyOverridesTable;
  user_sessions: UserSessionsTable;
  request_sessions: RequestSessionsTable;
  action_rate_limit_counters: ActionRateLimitCountersTable;
  auth_throttle_counters: AuthThrottleCountersTable;
  auth_events: AuthEventsTable;
  user_totp_factors: UserTotpFactorsTable;
  user_totp_recovery_codes: UserTotpRecoveryCodesTable;
  user_invites: UserInvitesTable;
  organizations: OrganizationsTable;
  contacts: ContactsTable;
  lead_assignments: LeadAssignmentsTable;
  sales_records: SalesRecordsTable;
  sales_record_client: SalesRecordClientTable;
  sales_record_addresses: SalesRecordAddressesTable;
  sales_record_products: SalesRecordProductsTable;
  sales_record_attempts: SalesRecordAttemptsTable;
  lead_policy_defaults: LeadPolicyDefaultsTable;
  lead_policy_overrides: LeadPolicyOverridesTable;
  search_capacity_grants: SearchCapacityGrantsTable;
  search_usage_reservations: SearchUsageReservationsTable;
  search_usage_commits: SearchUsageCommitsTable;
  lead_capacity_grants: LeadCapacityGrantsTable;
  lead_usage_reservations: LeadUsageReservationsTable;
  lead_usage_commits: LeadUsageCommitsTable;
  capacity_requests: CapacityRequestsTable;
  products: ProductsTable;
  interaction_logs: InteractionLogsTable;
  inventory_items: InventoryItemsTable;
  extension_handoffs: ExtensionHandoffsTable;
  extension_installation_sessions: ExtensionInstallationSessionsTable;
  extension_runtime_events: ExtensionRuntimeEventsTable;
  extension_executive_statuses: ExtensionExecutiveStatusesTable;
  agent_status_logs: AgentStatusLogsTable;
  audit_logs: AuditLogsTable;
  audit_action_policies: AuditActionPoliciesTable;
  action_observations: ActionObservationsTable;
  auth_funnel_events: AuthFunnelEventsTable;
  report_export_jobs: ReportExportJobsTable;
  report_export_downloads: ReportExportDownloadsTable;
  search_enrichment_jobs: SearchEnrichmentJobsTable;
  search_enrichment_overlays: SearchEnrichmentOverlaysTable;
  passkeys: PasskeysTable;
  webauthn_challenges: WebauthnChallengesTable;
  user_oauth_accounts: UserOAuthAccountsTable;
  password_reset_tokens: PasswordResetTokensTable;
  pipeline_leads: PipelineLeadsTable;
  pipeline_lead_commercial_inputs: PipelineLeadCommercialInputsTable;
  pipeline_quotations: PipelineQuotationsTable;
  pipeline_sales: PipelineSalesTable;
  pipeline_lead_assignments: PipelineLeadAssignmentsTable;
  pipeline_history_events: PipelineHistoryEventsTable;
  lead_sourcing_policies: LeadSourcingPoliciesTable;
  pipeline_integration_jobs: PipelineIntegrationJobsTable;
  pipeline_integration_import_rows: PipelineIntegrationImportRowsTable;
  pipeline_integration_outbox_needs_executive_input: PipelineIntegrationOutboxNeedsExecutiveInputTable;
  pipeline_integration_outbox_ready_for_quotation: PipelineIntegrationOutboxReadyForQuotationTable;
}
