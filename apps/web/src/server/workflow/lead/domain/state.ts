import {
  type LeadPriority,
  type LeadStage,
  type LeadStatus,
  type SettlementBank,
} from "~/contracts/workflow/vocabulary";
import type { Ruc } from "~/server/shared/document";
import { parseRuc } from "~/server/shared/document";
import type { DomainError } from "~/server/shared/domain-error";
import type { OrganizationId } from "~/server/shared/ids";
import { Ok, type Result } from "~/server/shared/result";

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
  id: string;
  organizationId: OrganizationId;
  ruc: Ruc;
  legalName: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  executiveId: number;
  createdBy: number;
  updatedBy: number | null;
  stage: LeadStage;
  status: LeadStatus | null;
  priority: LeadPriority | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  reservationExpiresAt: number | null;
  version: number;
};

// deletedAt is a lifecycle column set only by the delete command; a freshly
// created lead is never deleted, so it is not part of the creation draft.
// The draft also carries the born-complete commercial scope, which the INSERT
// writes onto the lead row alongside the lifecycle columns.
export type LeadDraft = Omit<LeadState, "id" | "version" | "deletedAt"> &
  LeadCommercialScope;

export function createLeadDraft(input: {
  organizationId: OrganizationId;
  ruc: string;
  legalName: string | null;
  address: string | null;
  executiveId: number;
  createdBy: number;
  commercialScope: LeadCommercialScope;
  now: number;
}): Result<LeadDraft, DomainError> {
  const ruc = parseRuc(input.ruc);
  if (!ruc.ok) return ruc;

  return Ok({
    organizationId: input.organizationId,
    ruc: ruc.value,
    legalName: input.legalName,
    address: input.address,
    district: null,
    department: null,
    executiveId: input.executiveId,
    createdBy: input.createdBy,
    updatedBy: null,
    stage: "QUALIFYING",
    status: null,
    priority: null,
    createdAt: input.now,
    updatedAt: input.now,
    reservationExpiresAt: null,
    ...input.commercialScope,
  });
}
