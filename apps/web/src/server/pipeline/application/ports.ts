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
  isActive: boolean;
  assignedAt: number;
};

export type LeadAssignment = LeadAssignmentDraft & {
  id: number;
};

export type LeadCommercialInput = {
  leadId: number;
  proveedorActual: string | null;
  tasaActual: number | null;
  gpv: number | null;
  ticket: number | null;
  abono: number | null;
  cantidadPos: number | null;
  updatedAt: number;
  updatedBy: number;
};

export type LeadCommercialInputDraft = LeadCommercialInput;

export type LeadQuotation = {
  id: number;
  leadId: number;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: "PEN" | "USD";
  version: number;
  createdAt: number;
  createdBy: number;
};

export type LeadQuotationDraft = Omit<LeadQuotation, "id">;

export type LeadSale = {
  id: number;
  leadId: number;
  executiveId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
  banco: string;
  nroCuenta: string;
  cci: string | null;
  createdAt: number;
};

export type LeadSaleDraft = Omit<LeadSale, "id">;

export type LeadSourcingPolicy = {
  branchId: number;
  engineAssignmentEnabled: boolean;
  updatedAt: number;
  updatedByUserId: number;
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
  isActive: boolean;
};

export type LeadExportRow = {
  id: number;
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  stage: LeadStage;
  status: LeadStatus | null;
  prioridad: LeadPriority | null;
  createdAt: number;
  executiveId: number;
  executiveName: string;
};

export type AuditLogDraft = {
  userId: number;
  action: string;
  entityType: string;
  entityId: number;
  changes: string | null;
  createdAt: number;
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
    listForExport(filters: { executiveId?: number }): Promise<LeadExportRow[]>;
  };
  leadAssignments: {
    insert(values: LeadAssignmentDraft): Promise<number>;
    deactivateActiveForLead(leadId: number): Promise<unknown>;
    findActiveByLead(leadId: number): Promise<LeadAssignment | undefined>;
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
    create(values: AuditLogDraft): Promise<unknown>;
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
