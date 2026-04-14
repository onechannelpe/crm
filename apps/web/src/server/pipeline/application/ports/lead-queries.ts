import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";

export type LeadListFilters = {
  executiveId?: number;
  stage?: LeadStage;
  status?: LeadStatus;
  prioridad?: LeadPriority;
  limit: number;
  offset: number;
};

export type LeadExportFilters = {
  executiveId?: number;
};

/**
 * Raw row returned by the list query before application-layer presenters
 * (e.g. nextStep) are applied.
 */
export type LeadListRow = {
  id: number;
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
  executiveName: string;
  stage: LeadStage;
  status: LeadStatus | null;
  prioridad: LeadPriority | null;
  createdAt: number;
  updatedAt: number;
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

/**
 * Read-only query object for lead list views and exports.
 * Owns the JOIN with users and returns fully-resolved view rows.
 * Kept separate from LeadRepository so domain write operations
 * stay unaffected by view-layer shape changes.
 */
export type LeadQueries = {
  list(filters: LeadListFilters): Promise<LeadListRow[]>;
  count(filters: LeadListFilters): Promise<number>;
  export(filters: LeadExportFilters): Promise<LeadExportRow[]>;
};
