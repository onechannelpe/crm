import type { LeadPriority, LeadStage, LeadStatus } from "~/contracts/workflow";
import type { Role } from "~/lib/auth/access/rbac";

export type LeadListFilters = {
  actorUserId: number;
  actorRole: Role;
  actorBranchId: number;
  executiveId?: number;
  stage?: LeadStage;
  status?: LeadStatus;
  prioridad?: LeadPriority;
  updatedSinceMs?: number;
  updatedUntilMs?: number;
  sortBy: "createdAt" | "updatedAt" | "registeredBy" | "ruc";
  sortDirection: "asc" | "desc";
  limit: number;
  offset: number;
};

export type RecordExportFilters = {
  actorUserId: number;
  actorRole: Role;
  actorBranchId: number;
  executiveId?: number;
};

/**
 * Raw row returned by the list query before application-layer presenters
 * (e.g. nextStep) are applied.
 */
export type LeadListRow = {
  id: string;
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
  executiveName: string;
  createdBy: number;
  createdByName: string;
  stage: LeadStage;
  status: LeadStatus | null;
  prioridad: LeadPriority | null;
  createdAt: number;
  updatedAt: number;
};

export type RecordExportRow = {
  id: string;
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
  export(filters: RecordExportFilters): Promise<RecordExportRow[]>;
};
