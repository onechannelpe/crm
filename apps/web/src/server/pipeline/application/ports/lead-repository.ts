import type {
  Lead,
  LeadDraft,
  LeadPatch,
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "../../domain/lead";

export type LeadListFilters = {
  executiveId?: number;
  stage?: LeadStage;
  status?: LeadStatus;
  prioridad?: LeadPriority;
  limit: number;
  offset: number;
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

export type LeadRepository = {
  insert(values: LeadDraft): Promise<number>;
  findById(id: number): Promise<Lead | undefined>;
  findByRuc(ruc: string): Promise<Lead | undefined>;
  findByRucMany(rucs: string[]): Promise<Lead[]>;
  updateById(id: number, values: LeadPatch): Promise<unknown>;
  list(filters: LeadListFilters): Promise<Lead[]>;
  count(filters: LeadListFilters): Promise<number>;
  listForExport(filters: { executiveId?: number }): Promise<LeadExportRow[]>;
};
