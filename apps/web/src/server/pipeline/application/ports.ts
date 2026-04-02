import type {
  LeadHistoryEntry,
  LeadHistoryEventDraft,
} from "../domain/history";
import type {
  Lead,
  LeadDraft,
  LeadPatch,
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "../domain/lead";

export type LeadAssignmentDraft = {
  leadId: number;
  executiveId: number;
  assignedBy: number;
  isActive: number;
  assignedAt: number;
};

export type LeadCommercialInput = {
  lead_id: number;
  proveedor_actual: string | null;
  tasa_actual: number | null;
  gpv: number | null;
  ticket: number | null;
  abono: number | null;
  cantidad_pos: number | null;
  updated_at: number;
  updated_by: number;
};

export type LeadCommercialInputDraft = LeadCommercialInput;

export type LeadQuotation = {
  id: number;
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
};

export type LeadQuotationDraft = Omit<LeadQuotation, "id">;

export type LeadSale = {
  id: number;
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
};

export type LeadSaleDraft = Omit<LeadSale, "id">;

export type LeadSourcingPolicy = {
  branch_id: number;
  engine_assignment_enabled: number;
  updated_at: number;
  updated_by_user_id: number;
};

export type LeadSourcingPolicyDraft = LeadSourcingPolicy;

export type LeadListFilters = {
  executiveId?: number;
  stage?: LeadStage;
  status?: LeadStatus;
  prioridad?: LeadPriority;
  limit: number;
  offset: number;
};

export type PipelineUser = {
  id: number;
  is_active: number;
};

export type PipelineDeps = {
  leads: {
    insert(values: LeadDraft): Promise<number>;
    findById(id: number): Promise<Lead | undefined>;
    findByRuc(ruc: string): Promise<Lead | undefined>;
    findByRucMany(rucs: string[]): Promise<Lead[]>;
    updateById(id: number, values: LeadPatch): Promise<unknown>;
    list(filters: LeadListFilters): Promise<Lead[]>;
    count(filters: LeadListFilters): Promise<number>;
    listForExport(filters: { executiveId?: number }): Promise<
      Array<{
        id: number;
        ruc: string;
        razon_social: string | null;
        address: string | null;
        stage: LeadStage;
        status: LeadStatus | null;
        prioridad: LeadPriority | null;
        created_at: number;
        executive_id: number;
        executive_name: string;
      }>
    >;
  };
  leadAssignments: {
    insert(values: LeadAssignmentDraft): Promise<number>;
    deactivateActiveForLead(leadId: number): Promise<unknown>;
    findActiveByLead(leadId: number): Promise<
      | {
          id: number;
          lead_id: number;
          executive_id: number;
          assigned_by: number;
          is_active: number;
          assigned_at: number;
        }
      | undefined
    >;
  };
  leadHistory: {
    insert(values: LeadHistoryEventDraft): Promise<number>;
    listByLeadId(leadId: number): Promise<LeadHistoryEntry[]>;
  };
  leadCommercialInputs: {
    findByLeadId(leadId: number): Promise<LeadCommercialInput | undefined>;
    upsert(values: LeadCommercialInputDraft): Promise<unknown>;
  };
  leadQuotations: {
    insert(values: LeadQuotationDraft): Promise<number>;
    listByLeadId(leadId: number): Promise<LeadQuotation[]>;
    nextVersion(leadId: number): Promise<number>;
  };
  leadSales: {
    insert(values: LeadSaleDraft): Promise<number>;
    findById(id: number): Promise<LeadSale | undefined>;
    findByLeadId(leadId: number): Promise<LeadSale | undefined>;
    list(limit: number, offset: number): Promise<LeadSale[]>;
    listByExecutive(
      executiveId: number,
      limit: number,
      offset: number,
    ): Promise<LeadSale[]>;
  };
  sourcingPolicies: {
    findByBranchId(branchId: number): Promise<LeadSourcingPolicy | undefined>;
    upsert(values: LeadSourcingPolicyDraft): Promise<unknown>;
  };
  users: {
    findById(id: number): Promise<PipelineUser | undefined>;
  };
  auditLogs: {
    create(values: {
      user_id: number;
      action: string;
      entity_type: string;
      entity_id: number;
      changes: string | null;
      created_at: number;
    }): Promise<unknown>;
  };
};

export type PipelineQueryDeps = PipelineDeps;

export type PipelineAuditService = {
  log(
    actorUserId: number,
    action: string,
    entity: string,
    entityId: number,
    changes?: Record<string, unknown>,
  ): Promise<unknown>;
};

export type PipelineEngineGateway = {
  enrichByRuc(ruc: string): Promise<{
    razonSocial: string | null;
    address: string | null;
  } | null>;
};
