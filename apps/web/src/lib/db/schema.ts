import type { ColumnType, Generated, Insertable, Selectable } from "kysely";

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
  email: string;
  password_hash: string;
  full_name: string;
  phone_e164: string | null;
  phone_verified_at: number | null;
  profile_confirmed_at: number | null;
  onboarding_completed_at: number | null;
  strong_auth_required: ColumnType<number, number | undefined, number>;
  strong_auth_enrolled_at: ColumnType<
    number | null,
    number | null | undefined,
    number | null
  >;
  role:
    | "executive"
    | "supervisor"
    | "back_office"
    | "sales_manager"
    | "logistics"
    | "hr"
    | "admin"
    | "superuser";
  is_active: number;
  created_at: number;
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

export interface QuotaAllocationsTable {
  id: Generated<number>;
  user_id: number;
  allocated_by_user_id: number;
  date: string;
  quota_amount: number;
  used_amount: number;
  created_at: number;
}

export interface ProductsTable {
  id: Generated<number>;
  name: string;
  category: string;
  subtype: string | null;
  price: number;
  is_active: number;
}

export interface ChargeNotesTable {
  id: Generated<number>;
  contact_id: number;
  user_id: number;
  status: "draft" | "pending_confirmation" | "confirmed" | "rejected";
  exec_code_real: string | null;
  exec_code_tdp: string | null;
  created_at: number;
  updated_at: number;
}

export interface ChargeNoteItemsTable {
  id: Generated<number>;
  charge_note_id: number;
  product_id: number;
  quantity: number;
}

export interface RejectionLogsTable {
  id: Generated<number>;
  charge_note_id: number;
  reviewer_id: number;
  field_id: string;
  reviewer_note: string | null;
  is_resolved: number;
  created_at: number;
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

export interface InventoryLocksTable {
  id: Generated<number>;
  inventory_item_id: number;
  charge_note_id: number;
  locked_at: number;
  expires_at: number;
}

export interface SalesDocumentsTable {
  id: Generated<number>;
  charge_note_id: number;
  original_name: string;
  mime_type: string;
  blob_sha256: string | null;
  status:
    | "pending_upload"
    | "available"
    | "upload_failed"
    | "deleted_soft"
    | "deleted_hard";
  created_by_user_id: number;
  created_at: number;
  deleted_at: number | null;
}

export interface SalesDocumentBlobsTable {
  sha256: string;
  storage_key: string;
  size_bytes: number;
  ref_count: number;
  created_at: number;
  updated_at: number;
}

export interface SalesDocumentEventsTable {
  id: Generated<number>;
  document_id: number;
  charge_note_id: number;
  actor_user_id: number | null;
  event_type:
    | "uploaded"
    | "upload_failed"
    | "soft_deleted"
    | "hard_deleted"
    | "integrity_missing_blob";
  details: string | null;
  created_at: number;
}

export interface SalesDocumentPoliciesTable {
  id: Generated<number>;
  scope: "global";
  max_file_size_bytes: number;
  allowed_mime_types_json: string;
  retention_days: number;
  hard_delete_enabled: number;
  created_at: number;
  updated_at: number;
}

export interface SalesDocumentUploadJobsTable {
  id: Generated<number>;
  document_id: number;
  blob_sha256: string;
  storage_key: string;
  payload_bytes: Uint8Array | null;
  status: "pending" | "leased" | "completed" | "failed";
  attempt_count: number;
  max_attempts: number;
  available_at: number;
  lease_until: number | null;
  last_error: string | null;
  created_at: number;
  updated_at: number;
}

export interface SalesDocumentGcTable {
  blob_sha256: string;
  storage_key: string;
  state: "idle" | "queued" | "leased" | "retry_wait" | "done" | "dead";
  generation: number;
  attempt_count: number;
  max_attempts: number;
  available_at: number;
  lease_until: number | null;
  last_error: string | null;
  created_at: number;
  updated_at: number;
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
}

export interface ReportExportDownloadsTable {
  id: Generated<number>;
  export_job_id: number;
  downloaded_by_user_id: number;
  downloaded_at: number;
  ip_hash: string | null;
  user_agent_hash: string | null;
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

export interface UserSessionsTable {
  id: string;
  user_id: number;
  branch_id: number;
  role: UsersTable["role"];
  auth_method: "password" | "password_totp" | "passkey";
  strong_auth_at: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: number;
  last_activity: number;
  expires_at: number;
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

export interface Database {
  branches: BranchesTable;
  teams: TeamsTable;
  users: UsersTable;
  notification_contacts: NotificationContactsTable;
  notification_preferences: NotificationPreferencesTable;
  notification_campaigns: NotificationCampaignsTable;
  notification_recipients: NotificationRecipientsTable;
  notification_jobs: NotificationJobsTable;
  notification_deliveries: NotificationDeliveriesTable;
  app_notifications: AppNotificationsTable;
  client_search_views: ClientSearchViewsTable;
  user_sessions: UserSessionsTable;
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
  quota_allocations: QuotaAllocationsTable;
  products: ProductsTable;
  charge_notes: ChargeNotesTable;
  charge_note_items: ChargeNoteItemsTable;
  rejection_logs: RejectionLogsTable;
  interaction_logs: InteractionLogsTable;
  inventory_items: InventoryItemsTable;
  inventory_locks: InventoryLocksTable;
  sales_documents: SalesDocumentsTable;
  sales_document_blobs: SalesDocumentBlobsTable;
  sales_document_events: SalesDocumentEventsTable;
  sales_document_policies: SalesDocumentPoliciesTable;
  sales_document_upload_jobs: SalesDocumentUploadJobsTable;
  sales_document_gc: SalesDocumentGcTable;
  agent_status_logs: AgentStatusLogsTable;
  audit_logs: AuditLogsTable;
  audit_action_policies: AuditActionPoliciesTable;
  action_observations: ActionObservationsTable;
  report_export_jobs: ReportExportJobsTable;
  report_export_downloads: ReportExportDownloadsTable;
  passkeys: PasskeysTable;
  webauthn_challenges: WebauthnChallengesTable;
}

export type Branch = Selectable<BranchesTable>;
export type User = Selectable<UsersTable>;
export type NotificationContact = Selectable<NotificationContactsTable>;
export type NotificationPreference = Selectable<NotificationPreferencesTable>;
export type NotificationCampaign = Selectable<NotificationCampaignsTable>;
export type NotificationRecipient = Selectable<NotificationRecipientsTable>;
export type NotificationJob = Selectable<NotificationJobsTable>;
export type NotificationDelivery = Selectable<NotificationDeliveriesTable>;
export type AppNotification = Selectable<AppNotificationsTable>;
export type ClientSearchView = Selectable<ClientSearchViewsTable>;
export type Organization = Selectable<OrganizationsTable>;
export type Contact = Selectable<ContactsTable>;
export type LeadAssignment = Selectable<LeadAssignmentsTable>;
export type SalesRecord = Selectable<SalesRecordsTable>;
export type SalesRecordClient = Selectable<SalesRecordClientTable>;
export type SalesRecordAddress = Selectable<SalesRecordAddressesTable>;
export type SalesRecordProduct = Selectable<SalesRecordProductsTable>;
export type SalesRecordAttempt = Selectable<SalesRecordAttemptsTable>;
export type QuotaAllocation = Selectable<QuotaAllocationsTable>;
export type Product = Selectable<ProductsTable>;
export type ChargeNote = Selectable<ChargeNotesTable>;
export type ChargeNoteItem = Selectable<ChargeNoteItemsTable>;
export type RejectionLog = Selectable<RejectionLogsTable>;
export type InteractionLog = Selectable<InteractionLogsTable>;
export type InventoryItem = Selectable<InventoryItemsTable>;
export type InventoryLock = Selectable<InventoryLocksTable>;
export type SalesDocument = Selectable<SalesDocumentsTable>;
export type SalesDocumentBlob = Selectable<SalesDocumentBlobsTable>;
export type SalesDocumentEvent = Selectable<SalesDocumentEventsTable>;
export type SalesDocumentPolicy = Selectable<SalesDocumentPoliciesTable>;
export type SalesDocumentUploadJob = Selectable<SalesDocumentUploadJobsTable>;
export type SalesDocumentGc = Selectable<SalesDocumentGcTable>;
export type AgentStatusLog = Selectable<AgentStatusLogsTable>;
export type AuditLog = Selectable<AuditLogsTable>;
export type AuditActionPolicy = Selectable<AuditActionPoliciesTable>;
export type ActionObservation = Selectable<ActionObservationsTable>;
export type ReportExportJob = Selectable<ReportExportJobsTable>;
export type ReportExportDownload = Selectable<ReportExportDownloadsTable>;
export type Passkey = Selectable<PasskeysTable>;
export type UserSession = Selectable<UserSessionsTable>;
export type AuthThrottleCounter = Selectable<AuthThrottleCountersTable>;
export type AuthEvent = Selectable<AuthEventsTable>;
export type UserTotpFactor = Selectable<UserTotpFactorsTable>;
export type UserTotpRecoveryCode = Selectable<UserTotpRecoveryCodesTable>;
export type UserInvite = Selectable<UserInvitesTable>;

export type NewUser = Insertable<UsersTable>;
export type NewNotificationContact = Insertable<NotificationContactsTable>;
export type NewNotificationPreference =
  Insertable<NotificationPreferencesTable>;
export type NewNotificationCampaign = Insertable<NotificationCampaignsTable>;
export type NewNotificationRecipient = Insertable<NotificationRecipientsTable>;
export type NewNotificationJob = Insertable<NotificationJobsTable>;
export type NewNotificationDelivery = Insertable<NotificationDeliveriesTable>;
export type NewAppNotification = Insertable<AppNotificationsTable>;
export type NewClientSearchView = Insertable<ClientSearchViewsTable>;
export type NewUserSession = Insertable<UserSessionsTable>;
export type NewAuthThrottleCounter = Insertable<AuthThrottleCountersTable>;
export type NewAuthEvent = Insertable<AuthEventsTable>;
export type NewUserTotpFactor = Insertable<UserTotpFactorsTable>;
export type NewUserTotpRecoveryCode = Insertable<UserTotpRecoveryCodesTable>;
export type NewUserInvite = Insertable<UserInvitesTable>;
export type NewOrganization = Insertable<OrganizationsTable>;
export type NewContact = Insertable<ContactsTable>;
export type NewLeadAssignment = Insertable<LeadAssignmentsTable>;
export type NewSalesRecord = Insertable<SalesRecordsTable>;
export type NewSalesRecordClient = Insertable<SalesRecordClientTable>;
export type NewSalesRecordAddress = Insertable<SalesRecordAddressesTable>;
export type NewSalesRecordProduct = Insertable<SalesRecordProductsTable>;
export type NewSalesRecordAttempt = Insertable<SalesRecordAttemptsTable>;
export type NewQuotaAllocation = Insertable<QuotaAllocationsTable>;
export type NewChargeNote = Insertable<ChargeNotesTable>;
export type NewChargeNoteItem = Insertable<ChargeNoteItemsTable>;
export type NewRejectionLog = Insertable<RejectionLogsTable>;
export type NewInteractionLog = Insertable<InteractionLogsTable>;
export type NewAuditLog = Insertable<AuditLogsTable>;
export type NewAuditActionPolicy = Insertable<AuditActionPoliciesTable>;
export type NewActionObservation = Insertable<ActionObservationsTable>;
export type NewReportExportJob = Insertable<ReportExportJobsTable>;
export type NewReportExportDownload = Insertable<ReportExportDownloadsTable>;
