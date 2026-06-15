import {
  type LeadPriority,
  type LeadStage,
  type LeadStatus,
} from "~/contracts/workflow/vocabulary";
import type { DomainError } from "~/server/shared/domain-error";
import type { OrganizationId } from "~/server/shared/ids";
import { Ok, type Result } from "~/server/shared/result";

import { normalizeLeadRuc } from "../../parsers";

export type LeadState = {
  id: string;
  organizationId: OrganizationId;
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  executiveId: number;
  createdBy: number;
  updatedBy: number | null;
  stage: LeadStage;
  status: LeadStatus | null;
  prioridad: LeadPriority | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  reservationExpiresAt: number | null;
  version: number;
};

// deletedAt is a lifecycle column set only by the delete command; a freshly
// created lead is never deleted, so it is not part of the creation draft.
export type LeadDraft = Omit<LeadState, "id" | "version" | "deletedAt">;

export function createLeadDraft(input: {
  organizationId: OrganizationId;
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
  createdBy: number;
  now: number;
}): Result<LeadDraft, DomainError> {
  const ruc = normalizeLeadRuc(input.ruc);
  if (!ruc.ok) return ruc;

  return Ok({
    organizationId: input.organizationId,
    ruc: ruc.value,
    razonSocial: input.razonSocial,
    address: input.address,
    district: null,
    department: null,
    executiveId: input.executiveId,
    createdBy: input.createdBy,
    updatedBy: null,
    stage: "QUALIFYING",
    status: null,
    prioridad: null,
    createdAt: input.now,
    updatedAt: input.now,
    reservationExpiresAt: null,
  });
}
