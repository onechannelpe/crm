import type { Generated } from "kysely";

import type {
  AbonoBank,
  LeadStage,
  ModalidadCobro,
  ProductScope,
} from "~/contracts/workflow/vocabulary";

export interface WorkflowLeadsTable {
  id: Generated<string>;
  organization_id: string;
  executive_id: number;
  stage: LeadStage;
  status: "DISPONIBLE" | "SIN RESULTADO" | "CARTERIZADO" | "STOCK" | null;
  prioridad: "P1" | "P2" | "SIN RESULTADO" | null;
  created_by: number;
  updated_by: number | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  reservation_expires_at: number | null;
  version: Generated<number>;
}

export interface WorkflowIdempotencyKeysTable {
  key: string;
  result_json: string;
  created_at: number;
}

export interface WorkflowLeadProfilesTable {
  lead_id: string;
  proveedor_actual: string | null;
  tasa_actual: number | null;
  gpv: number | null;
  ticket: number | null;
  link_scope: ProductScope;
  link_url: string | null;
  online_scope: ProductScope;
  online_url: string | null;
  online_modalidad: ModalidadCobro | null;
  abono_bank: AbonoBank | null;
  pos_total: number | null;
  updated_at: number;
  updated_by: number;
}

export interface WorkflowModalidadCobroKindsTable {
  value: ModalidadCobro;
}

export interface WorkflowLeadAssignmentsTable {
  id: Generated<string>;
  lead_id: string;
  executive_id: number;
  assigned_by: number;
  is_active: number;
  assigned_at: number;
}

export interface WorkflowLeadFavoritesTable {
  lead_id: string;
  user_id: number;
  created_at: number;
}

export interface WorkflowHistoryEventsTable {
  id: Generated<string>;
  lead_id: string;
  event_type:
    | "lead_registered"
    | "lead_status_updated"
    | "lead_priority_updated"
    | "lead_reviewed"
    | "workflow_stage_changed"
    | "lead_assigned"
    | "lead_reassigned"
    | "rep_legal_recorded"
    | "rate_proposed"
    | "rate_revision_requested"
    | "rate_accepted"
    | "lead_reservation_expired"
    | "venue_added"
    | "venue_updated"
    | "venue_accounts_added"
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

export interface WorkflowAuditLogsTable {
  id: Generated<string>;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: string | null;
  created_at: number;
}
