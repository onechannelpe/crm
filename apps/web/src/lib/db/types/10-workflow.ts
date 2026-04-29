import type { Generated } from "kysely";

import type {
  CulqiProductKind,
  ModalidadCobro,
} from "../../../workflow/contracts/lead-schema";

export type WorkflowStageValue =
  | "PENDING_EXTERNAL_REVIEW"
  | "REJECTED_BY_STATUS"
  | "NEEDS_EXECUTIVE_INPUT"
  | "READY_FOR_QUOTATION"
  | "QUOTED"
  | "READY_FOR_SALE"
  | "CONVERTED";

export interface WorkflowLeadsTable {
  id: Generated<string>;
  ruc: string;
  razon_social: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  executive_id: number;
  stage: WorkflowStageValue;
  status: "DISPONIBLE" | "SIN RESULTADO" | "CARTERIZADO" | "STOCK" | null;
  prioridad: "P1" | "P2" | "SIN RESULTADO" | null;
  created_by: number;
  updated_by: number | null;
  created_at: number;
  updated_at: number;
}

export interface WorkflowLeadCommercialInputsTable {
  lead_id: string;
  proveedor_actual: string | null;
  tasa_actual: number | null;
  gpv: number | null;
  ticket: number | null;
  giro_negocio: string | null;
  tipo_producto: CulqiProductKind | null;
  url_cliente: string | null;
  modalidad_cobro: ModalidadCobro;
  rep_legal_nombres: string | null;
  rep_legal_apellido_paterno: string | null;
  rep_legal_apellido_materno: string | null;
  rep_legal_dni: string | null;
  rep_legal_telefono: string | null;
  rep_legal_email: string | null;
  updated_at: number;
  updated_by: number;
}

export interface WorkflowQuotationsTable {
  id: Generated<string>;
  lead_id: string;
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

export interface WorkflowSalesTable {
  id: Generated<string>;
  lead_id: string;
  executive_id: number;
  created_at: number;
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
    | "commercial_input_completed"
    | "quotation_created"
    | "sale_approved"
    | "sale_created"
    | "venue_added"
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

export type Db = {
  workflow_leads: WorkflowLeadsTable;
  workflow_lead_commercial_inputs: WorkflowLeadCommercialInputsTable;
  workflow_quotations: WorkflowQuotationsTable;
  workflow_sales: WorkflowSalesTable;
  workflow_lead_assignments: WorkflowLeadAssignmentsTable;
  workflow_lead_favorites: WorkflowLeadFavoritesTable;
  workflow_history_events: WorkflowHistoryEventsTable;
  workflow_audit_logs: WorkflowAuditLogsTable;
  lead_sourcing_policies: LeadSourcingPoliciesTable;
};
