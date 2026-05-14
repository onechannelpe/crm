import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";
import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/server/workflow/types";

import type {
  LeadHistoryEntry,
  LeadHistoryEventDraft,
} from "../../domain/history";
import type {
  LeadDraft,
  LeadPatch,
  LeadRecord,
} from "../../domain/lead-record";
import type { LeadMutationEvents } from "../../domain/lead/lead-events";
import type {
  LeadMutationIntent,
  LeadMutationPatch,
} from "../../domain/lead/lead-types";

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

export type LeadAssignmentMutationRepository = {
  replaceActiveAssignment(input: {
    leadId: string;
    toExecutiveId: number;
    assignedBy: number;
    assignedAt: number;
  }): Promise<void>;
};

export type LeadHistoryRepository = {
  insert(values: LeadHistoryEventDraft): Promise<string>;
  listByLeadId(
    leadId: string,
  ): Promise<Result<LeadHistoryEntry[], DomainError>>;
};

export type LeadEventRepository = {
  append(events: LeadHistoryEventDraft[]): Promise<string[]>;
};

export type LeadAuditRepository = {
  append(input: {
    actorUserId: number;
    action: string;
    entityId: string;
    changes?: Record<string, unknown>;
  }): Promise<void>;
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

export type LeadMutationOutcome = {
  events: LeadMutationEvents;
  historyIds: string[];
};

export type CheckedLeadMutationOutcome = {
  applied: boolean;
  events?: LeadMutationOutcome["events"];
  historyIds?: string[];
};

export type LeadAssignmentMutationInput = {
  leadId: string;
  toExecutiveId: number;
  assignedBy: number;
  assignedAt: number;
};

export type LeadMutationUow = {
  commit(input: {
    lead: LeadRecord;
    actorUserId: number;
    now: number;
    intent: LeadMutationIntent;
    assignment?: LeadAssignmentMutationInput;
  }): Promise<Result<LeadMutationOutcome, DomainError>>;
  commitChecked(input: {
    lead: LeadRecord;
    actorUserId: number;
    now: number;
    expectedUpdatedAt: number;
    intent: LeadMutationIntent;
  }): Promise<Result<CheckedLeadMutationOutcome, DomainError>>;
  derivePatch(input: {
    lead: LeadRecord;
    intent: LeadMutationIntent;
  }): Result<LeadMutationPatch, DomainError>;
};

export type LeadReadRepository = {
  findById(id: string): Promise<LeadRecord | undefined>;
};

export type LeadRepository = {
  insert(values: LeadDraft): Promise<string>;
  findById(id: string): Promise<LeadRecord | undefined>;
  findByRuc(ruc: string): Promise<LeadRecord | undefined>;
  findByRucMany(rucs: string[]): Promise<LeadRecord[]>;
  updateById(id: string, values: LeadPatch): Promise<unknown>;
  updateByRuc(ruc: string, values: LeadPatch): Promise<unknown>;
};

export type LeadWriteRepository = {
  updateLead(input: {
    leadId: string;
    actorUserId: number;
    now: number;
    patch: Omit<LeadPatch, "updatedBy" | "updatedAt">;
  }): Promise<void>;
};

export type CheckedLeadWriteRepository = {
  updateLeadChecked(input: {
    leadId: string;
    actorUserId: number;
    now: number;
    expectedUpdatedAt: number;
    patch: Omit<LeadPatch, "updatedBy" | "updatedAt">;
  }): Promise<boolean>;
};

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

export type LeadQueries = {
  list(filters: LeadListFilters): Promise<LeadListRow[]>;
  count(filters: LeadListFilters): Promise<number>;
  export(filters: RecordExportFilters): Promise<RecordExportRow[]>;
};
