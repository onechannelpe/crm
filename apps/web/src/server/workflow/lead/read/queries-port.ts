import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";
import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/server/workflow/types";

import type { LeadHistoryEntry } from "../../lead/domain/history";
import type {
  LeadCommercialScope,
  LeadDraft,
  LeadState,
} from "../../lead/domain/state";

export type LeadPatch = Partial<
  Omit<
    LeadState,
    | "id"
    | "version"
    | "createdAt"
    | "createdBy"
    | "organizationId"
    | "ruc"
    | "legalName"
    | "address"
    | "district"
    | "department"
  >
>;

export type LeadAssignmentDraft = {
  leadId: string;
  executiveId: number;
  assignedBy: number;
  isActive: boolean;
  assignedAt: number;
};

export type LeadAssignment = LeadAssignmentDraft & {
  id: string;
};

export type LeadAssignmentRepository = {
  insert(values: LeadAssignmentDraft): Promise<string>;
  deactivateActiveForLead(leadId: string): Promise<unknown>;
  findActiveByLead(leadId: string): Promise<LeadAssignment | undefined>;
};

export type LeadHistoryRepository = {
  listByLeadId(
    leadId: string,
  ): Promise<Result<LeadHistoryEntry[], DomainError>>;
};

export type LeadFavoriteRepository = {
  isFavoriteForUser(input: {
    leadId: string;
    userId: number;
  }): Promise<boolean>;
  addForUser(input: {
    leadId: string;
    userId: number;
    createdAt: number;
  }): Promise<void>;
  removeForUser(input: { leadId: string; userId: number }): Promise<void>;
};

export type LeadReadRepository = {
  findById(id: string): Promise<LeadState | undefined>;
};

export type LeadRepository = {
  insert(values: LeadDraft): Promise<string>;
  findById(id: string): Promise<LeadState | undefined>;
  findCommercialScope(leadId: string): Promise<LeadCommercialScope | undefined>;
  findByRuc(ruc: string): Promise<LeadState | undefined>;
  findByRucMany(rucs: string[]): Promise<LeadState[]>;
  updateById(id: string, values: LeadPatch): Promise<unknown>;
  updateByRuc(ruc: string, values: LeadPatch): Promise<unknown>;
  updateCommercialSnapshot(
    leadId: string,
    scope: LeadCommercialScope,
    updatedAt: number,
    updatedBy: number,
  ): Promise<unknown>;
};

export type LeadListFilters = {
  actorUserId: number;
  actorRole: Role;
  actorBranchId: number;
  executiveId?: number;
  stage?: LeadStage;
  status?: LeadStatus;
  priority?: LeadPriority;
  updatedSinceMs?: number;
  updatedUntilMs?: number;
  anyFieldSearch?: string;
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

export type LeadListRow = {
  id: string;
  ruc: string;
  legalName: string | null;
  address: string | null;
  executiveId: number;
  executiveName: string;
  createdBy: number;
  createdByName: string;
  stage: LeadStage;
  status: LeadStatus | null;
  priority: LeadPriority | null;
  createdAt: number;
  updatedAt: number;
};

export type RecordExportRow = {
  id: string;
  ruc: string;
  legalName: string | null;
  address: string | null;
  stage: LeadStage;
  status: LeadStatus | null;
  priority: LeadPriority | null;
  createdAt: number;
  executiveId: number;
  executiveName: string;
  currentProvider: string;
  currentDebitRate: number;
  currentCreditRate: number;
  gpv: number;
  proposedDebitRate: number | null;
  proposedCreditRate: number | null;
};

export type LeadQueries = {
  list(filters: LeadListFilters): Promise<LeadListRow[]>;
  count(filters: LeadListFilters): Promise<number>;
  export(filters: RecordExportFilters): Promise<RecordExportRow[]>;
};
