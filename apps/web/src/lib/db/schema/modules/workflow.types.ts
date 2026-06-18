import type { Generated } from "kysely";

import type {
  SettlementBank,
  LeadStage,
  CollectionMode,
  ProductScope,
} from "~/contracts/workflow/vocabulary";

export interface WorkflowLeadsTable {
  id: Generated<string>;
  organization_id: string;
  executive_id: number;
  stage: LeadStage;
  status: "DISPONIBLE" | "SIN RESULTADO" | "CARTERIZADO" | "STOCK" | null;
  priority: "P1" | "P2" | "SIN RESULTADO" | null;
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
  current_provider: string;
  current_debit_rate: number;
  current_credit_rate: number;
  gpv: number;
  ticket: number;
  link_scope: ProductScope;
  link_url: string | null;
  online_scope: ProductScope;
  online_url: string | null;
  online_collection_mode: CollectionMode | null;
  settlement_bank: SettlementBank;
  pos_count: number;
  updated_at: number;
  updated_by: number;
}

export interface WorkflowModalidadCobroKindsTable {
  value: CollectionMode;
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

export interface LeadSourcingPoliciesTable {
  branch_id: number;
  engine_assignment_enabled: number;
  updated_at: number;
  updated_by_user_id: number;
}
