import type { ColumnType, Insertable, Selectable } from "kysely";

export interface Database {
  branches: BranchesTable;
  teams: TeamsTable;
  users: UsersTable;
  organizations: OrganizationsTable;
  contacts: ContactsTable;
  lead_assignments: LeadAssignmentsTable;
  quota_allocations: QuotaAllocationsTable;
  products: ProductsTable;
  charge_notes: ChargeNotesTable;
  charge_note_items: ChargeNoteItemsTable;
  rejection_logs: RejectionLogsTable;
  interaction_logs: InteractionLogsTable;
  inventory_items: InventoryItemsTable;
  inventory_locks: InventoryLocksTable;
  document_attachments: DocumentAttachmentsTable;
  agent_status_logs: AgentStatusLogsTable;
  audit_logs: AuditLogsTable;
  passkeys: PasskeysTable;
  webauthn_challenges: WebauthnChallengesTable;
}

export interface BranchesTable {
  id: ColumnType<number, never, never>;
  name: string;
  created_at: number;
}

export interface TeamsTable {
  id: ColumnType<number, never, never>;
  branch_id: number;
  name: string;
  supervisor_id: number | null;
  created_at: number;
}

export interface UsersTable {
  id: ColumnType<number, never, never>;
  branch_id: number;
  team_id: number | null;
  email: string;
  password_hash: string;
  full_name: string;
  role: "executive" | "supervisor" | "back_office" | "sales_manager" | "admin";
  is_active: boolean;
  created_at: number;
}

export interface OrganizationsTable {
  id: ColumnType<number, never, never>;
  ruc: string;
  name: string;
  locked_branch_id: number | null;
  locked_at: number | null;
  locked_by_user_id: number | null;
  created_at: number;
}

export interface ContactsTable {
  id: ColumnType<number, never, never>;
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
  id: ColumnType<number, never, never>;
  user_id: number;
  contact_id: number;
  assigned_at: number;
  expires_at: number;
  status: "Active" | "Completed";
}

export interface QuotaAllocationsTable {
  id: ColumnType<number, never, never>;
  user_id: number;
  allocated_by_supervisor_id: number;
  date: string;
  quota_amount: number;
  used_amount: number;
  created_at: number;
}

export interface ProductsTable {
  id: ColumnType<number, never, never>;
  name: string;
  category: "Fijo" | "Movil";
  subtype: "Mono" | "Duo" | "Trio" | null;
  price: number;
  is_active: boolean;
}

export interface ChargeNotesTable {
  id: ColumnType<number, never, never>;
  contact_id: number;
  user_id: number;
  status: "Draft" | "Pending_Back" | "Rejected" | "Approved";
  exec_code_real: string | null;
  exec_code_tdp: string | null;
  created_at: number;
  updated_at: number;
}

export interface ChargeNoteItemsTable {
  id: ColumnType<number, never, never>;
  charge_note_id: number;
  product_id: number;
  quantity: number;
}

export interface RejectionLogsTable {
  id: ColumnType<number, never, never>;
  charge_note_id: number;
  reviewer_id: number;
  field_id: string;
  reviewer_note: string;
  is_resolved: boolean;
  created_at: number;
}

export interface InteractionLogsTable {
  id: ColumnType<number, never, never>;
  contact_id: number;
  user_id: number;
  outcome: string;
  notes: string | null;
  duration_seconds: number | null;
  created_at: number;
}

export interface InventoryItemsTable {
  id: ColumnType<number, never, never>;
  product_id: number;
  serial_number: string;
  status: "Available" | "Reserved" | "Sold";
  created_at: number;
}

export interface InventoryLocksTable {
  id: ColumnType<number, never, never>;
  inventory_item_id: number;
  charge_note_id: number;
  locked_at: number;
  expires_at: number;
}

export interface DocumentAttachmentsTable {
  id: ColumnType<number, never, never>;
  charge_note_id: number;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  version: number;
  created_at: number;
}

export interface AgentStatusLogsTable {
  id: ColumnType<number, never, never>;
  user_id: number;
  status: "Available" | "Feedback" | "Break" | "Services" | "Training" | "Unavailable";
  latitude: number;
  longitude: number;
  comment: string | null;
  started_at: number;
  ended_at: number | null;
}

export interface AuditLogsTable {
  id: ColumnType<number, never, never>;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  changes: string | null;
  created_at: number;
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
  id: ColumnType<number, never, never>;
  user_id: number | null;
  type: "registration" | "authentication";
  challenge: string;
  expires_at: number;
  created_at: number;
}

export type Branch = Selectable<BranchesTable>;
export type Team = Selectable<TeamsTable>;
export type User = Selectable<UsersTable>;
export type Organization = Selectable<OrganizationsTable>;
export type Contact = Selectable<ContactsTable>;
export type LeadAssignment = Selectable<LeadAssignmentsTable>;
export type QuotaAllocation = Selectable<QuotaAllocationsTable>;
export type Product = Selectable<ProductsTable>;
export type ChargeNote = Selectable<ChargeNotesTable>;
export type ChargeNoteItem = Selectable<ChargeNoteItemsTable>;
export type RejectionLog = Selectable<RejectionLogsTable>;
export type InteractionLog = Selectable<InteractionLogsTable>;
export type InventoryItem = Selectable<InventoryItemsTable>;
export type InventoryLock = Selectable<InventoryLocksTable>;
export type DocumentAttachment = Selectable<DocumentAttachmentsTable>;
export type AgentStatusLog = Selectable<AgentStatusLogsTable>;
export type AuditLog = Selectable<AuditLogsTable>;
export type Passkey = Selectable<PasskeysTable>;
export type WebauthnChallenge = Selectable<WebauthnChallengesTable>;

export type NewBranch = Insertable<BranchesTable>;
export type NewTeam = Insertable<TeamsTable>;
export type NewUser = Insertable<UsersTable>;
export type NewOrganization = Insertable<OrganizationsTable>;
export type NewContact = Insertable<ContactsTable>;
export type NewLeadAssignment = Insertable<LeadAssignmentsTable>;
export type NewQuotaAllocation = Insertable<QuotaAllocationsTable>;
export type NewProduct = Insertable<ProductsTable>;
export type NewChargeNote = Insertable<ChargeNotesTable>;
export type NewChargeNoteItem = Insertable<ChargeNoteItemsTable>;
export type NewRejectionLog = Insertable<RejectionLogsTable>;
export type NewInteractionLog = Insertable<InteractionLogsTable>;
export type NewInventoryItem = Insertable<InventoryItemsTable>;
export type NewInventoryLock = Insertable<InventoryLocksTable>;
export type NewDocumentAttachment = Insertable<DocumentAttachmentsTable>;
export type NewAgentStatusLog = Insertable<AgentStatusLogsTable>;
export type NewAuditLog = Insertable<AuditLogsTable>;
export type NewPasskey = Insertable<PasskeysTable>;
export type NewWebauthnChallenge = Insertable<WebauthnChallengesTable>;
