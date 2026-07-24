import type { Generated } from "kysely";

import type {
  SettlementBank,
  LeadStage,
  CollectionMode,
  ProductScope,
  InquiryState,
  LeadStatus,
  LeadPriority,
} from "~/contracts/workflow/vocabulary";
import type {
  BranchId,
  GeneratedId,
  IdColumn,
  IntegrationJobId,
  NullableIdColumn,
  OrganizationId,
  UserId,
  WorkflowInquiryId,
  WorkflowLeadId,
} from "~/server/shared/ids";

export interface WorkflowLeadsTable {
  id: GeneratedId<WorkflowLeadId>;
  organization_id: IdColumn<OrganizationId>;
  stage: LeadStage;
  status: "DISPONIBLE" | "SIN RESULTADO" | "CARTERIZADO" | "STOCK" | null;
  priority: "P1" | "P2" | "SIN RESULTADO" | null;
  created_by: IdColumn<UserId>;
  updated_by: NullableIdColumn<UserId>;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  reservation_expires_at: Date | null;
  version: Generated<number>;
  current_provider: string;
  current_debit_rate: number;
  current_credit_rate: number;
  gpv: number;
  ticket: number;
  settlement_bank: SettlementBank;
  pos_count: number;
}

export interface WorkflowInquiriesTable {
  id: GeneratedId<WorkflowInquiryId>;
  ruc: string;
  executive_id: IdColumn<UserId>;
  state: InquiryState;
  status: LeadStatus | null;
  priority: LeadPriority | null;
  answered_at: Date | null;
  answered_by: NullableIdColumn<UserId>;
  answered_by_job_id: NullableIdColumn<IntegrationJobId>;
  converted_lead_id: NullableIdColumn<WorkflowLeadId>;
  created_at: Date;
  updated_at: Date;
}

export interface WorkflowLeadDigitalPolicyTable {
  lead_id: IdColumn<WorkflowLeadId>;
  link_scope: ProductScope;
  link_url: string | null;
  online_scope: ProductScope;
  online_url: string | null;
  online_collection_mode: CollectionMode | null;
  updated_at: Date;
  updated_by: IdColumn<UserId>;
}

export interface WorkflowCollectionModeKindsTable {
  value: CollectionMode;
}

export interface WorkflowLeadFavoritesTable {
  lead_id: IdColumn<WorkflowLeadId>;
  user_id: IdColumn<UserId>;
  created_at: Date;
}

export interface LeadSourcingPoliciesTable {
  branch_id: IdColumn<BranchId>;
  engine_assignment_enabled: boolean;
  updated_at: Date;
  updated_by_user_id: IdColumn<UserId>;
}
