import type { Generated, Insertable, Selectable } from "kysely";

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
    role: "executive" | "supervisor" | "back_office" | "sales_manager" | "logistics" | "hr" | "admin" | "superuser";
    is_active: number;
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
    status: "draft" | "pending_review" | "approved" | "rejected";
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

export interface DocumentAttachmentsTable {
    id: Generated<number>;
    charge_note_id: number;
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
    version: number;
    created_at: number;
}

export interface AgentStatusLogsTable {
    id: Generated<number>;
    user_id: number;
    status: "available" | "feedback" | "break" | "services" | "training" | "unavailable";
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
    role: string;
    ip_address: string | null;
    user_agent: string | null;
    created_at: number;
    last_activity: number;
    expires_at: number;
}

export interface Database {
    branches: BranchesTable;
    teams: TeamsTable;
    users: UsersTable;
    user_sessions: UserSessionsTable;
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

export type Branch = Selectable<BranchesTable>;
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
export type UserSession = Selectable<UserSessionsTable>;

export type NewUser = Insertable<UsersTable>;
export type NewUserSession = Insertable<UserSessionsTable>;
export type NewOrganization = Insertable<OrganizationsTable>;
export type NewContact = Insertable<ContactsTable>;
export type NewLeadAssignment = Insertable<LeadAssignmentsTable>;
export type NewQuotaAllocation = Insertable<QuotaAllocationsTable>;
export type NewChargeNote = Insertable<ChargeNotesTable>;
export type NewChargeNoteItem = Insertable<ChargeNoteItemsTable>;
export type NewRejectionLog = Insertable<RejectionLogsTable>;
export type NewInteractionLog = Insertable<InteractionLogsTable>;
export type NewAuditLog = Insertable<AuditLogsTable>;
