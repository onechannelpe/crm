import type { ColumnType, Insertable, Selectable } from "kysely";

export interface Database {
  users: UsersTable;
  sessions: SessionsTable;
  passkeys: PasskeysTable;
  webauthn_challenges: WebauthnChallengesTable;
  lead_assignments: LeadAssignmentsTable;
  products: ProductsTable;
  charge_notes: ChargeNotesTable;
  charge_note_items: ChargeNoteItemsTable;
  rejection_logs: RejectionLogsTable;
  interaction_logs: InteractionLogsTable;
  stage_history: StageHistoryTable;
}

export interface UsersTable {
  id: ColumnType<number, never, never>;
  branch_id: number;
  team_id: number | null;
  email: string;
  password_hash: string;
  full_name: string;
  role: "executive" | "supervisor" | "back_office" | "sales_manager" | "admin";
  is_active: number;
  created_at: number;
}

export interface SessionsTable {
  id: string;
  user_id: number;
  expires_at: number;
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

export interface LeadAssignmentsTable {
  id: ColumnType<number, never, never>;
  user_id: number;
  contact_id: number;
  assigned_at: number;
  expires_at: number;
  status: "Active" | "Completed";
}

export interface ProductsTable {
  id: ColumnType<number, never, never>;
  name: string;
  category: "Fijo" | "Movil";
  subtype: "Mono" | "Duo" | "Trio" | null;
  price: number;
  is_active: number;
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
  is_resolved: number;
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

export interface StageHistoryTable {
  id: ColumnType<number, never, never>;
  entity_type: string;
  entity_id: number;
  from_status: string | null;
  to_status: string;
  actor_id: number;
  created_at: number;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type Session = Selectable<SessionsTable>;
export type Passkey = Selectable<PasskeysTable>;
export type WebauthnChallenge = Selectable<WebauthnChallengesTable>;
export type LeadAssignment = Selectable<LeadAssignmentsTable>;
export type Product = Selectable<ProductsTable>;
export type ChargeNote = Selectable<ChargeNotesTable>;
export type ChargeNoteItem = Selectable<ChargeNoteItemsTable>;
export type RejectionLog = Selectable<RejectionLogsTable>;
export type InteractionLog = Selectable<InteractionLogsTable>;
export type StageHistory = Selectable<StageHistoryTable>;
