import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";

import type {
  LeadDraft,
  LeadPatch,
  LeadRecord,
} from "../../domain/lead-record";

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
  findById(id: number): Promise<LeadRecord | undefined>;
  findByRuc(ruc: string): Promise<LeadRecord | undefined>;
  findByRucMany(rucs: string[]): Promise<LeadRecord[]>;
  updateById(id: number, values: LeadPatch): Promise<unknown>;
  list(filters: LeadListFilters): Promise<LeadRecord[]>;
  count(filters: LeadListFilters): Promise<number>;
};

export type LeadExportQuery = {
  list(filters: { executiveId?: number }): Promise<LeadExportRow[]>;
};
