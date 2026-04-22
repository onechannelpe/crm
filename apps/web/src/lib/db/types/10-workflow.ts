import type { Generated } from "kysely";

export type PipelineStageValue =
  | "PENDING_EXTERNAL_REVIEW"
  | "REJECTED_BY_STATUS"
  | "NEEDS_EXECUTIVE_INPUT"
  | "READY_FOR_QUOTATION"
  | "QUOTED"
  | "READY_FOR_SALE"
  | "CONVERTED";

export interface PipelineLeadsTable {
  id: Generated<number>;
  ruc: string;
  razon_social: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  executive_id: number;
  stage: PipelineStageValue;
  status: "DISPONIBLE" | "SIN RESULTADO" | "CARTERIZADO" | "STOCK" | null;
  prioridad: "P1" | "P2" | "SIN RESULTADO" | null;
  created_by: number;
  updated_by: number | null;
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

export type Db = {
  pipeline_leads: PipelineLeadsTable;
  pipeline_lead_commercial_inputs: PipelineLeadCommercialInputsTable;
  pipeline_quotations: PipelineQuotationsTable;
  pipeline_sales: PipelineSalesTable;
  pipeline_lead_assignments: PipelineLeadAssignmentsTable;
  pipeline_history_events: PipelineHistoryEventsTable;
  lead_sourcing_policies: LeadSourcingPoliciesTable;
};
