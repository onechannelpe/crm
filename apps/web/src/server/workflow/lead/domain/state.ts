import {
  type LeadPriority,
  type LeadStage,
  type LeadStatus,
  type SettlementBank,
} from "~/contracts/workflow/vocabulary";
import type { DomainError } from "~/domain/errors";
import { parseRuc, type Ruc } from "~/domain/identity/document";
import type {
  BranchId,
  OrganizationId,
  UserId,
  WorkflowLeadId,
} from "~/domain/ids";
import { Ok, type Result } from "~/shared/result";

export type LeadCommercialScope = {
  currentProvider: string;
  currentDebitRate: number;
  currentCreditRate: number;
  gpv: number;
  ticket: number;
  settlementBank: SettlementBank;
  posCount: number;
};

export type LeadState = {
  id: WorkflowLeadId;
  organizationId: OrganizationId;
  ruc: Ruc;
  legalName: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  executiveId: UserId;
  // Denormalized from the assigned executive; ownership guarantees it exists.
  branchId: BranchId;
  createdBy: UserId;
  updatedBy: UserId | null;
  stage: LeadStage;
  status: LeadStatus | null;
  priority: LeadPriority | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  reservationExpiresAt: Date | null;
  version: number;
};

export type LeadDraft = Omit<LeadState, "id" | "version" | "deletedAt"> &
  LeadCommercialScope;

export function createLeadDraft(input: {
  organizationId: OrganizationId;
  ruc: string;
  legalName: string | null;
  address: string | null;
  executiveId: UserId;
  branchId: BranchId;
  createdBy: UserId;
  commercialScope: LeadCommercialScope;
  createdAt: Date;
}): Result<LeadDraft, DomainError> {
  const parsedRuc = parseRuc(input.ruc);

  if (!parsedRuc.ok) {
    return parsedRuc;
  }

  return Ok({
    organizationId: input.organizationId,
    ruc: parsedRuc.value,
    legalName: input.legalName,
    address: input.address,
    district: null,
    department: null,
    executiveId: input.executiveId,
    branchId: input.branchId,
    createdBy: input.createdBy,
    updatedBy: null,
    stage: "QUALIFYING",
    status: null,
    priority: null,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    reservationExpiresAt: null,
    ...input.commercialScope,
  });
}
