import type { LeadPriority, LeadStage, LeadStatus } from "~/contracts/workflow";
import type { DomainError } from "~/server/shared/domain-error";
import type { OrganizationId } from "~/server/shared/ids";
import { Ok, type Result } from "~/server/shared/result";

import { normalizeLeadRuc } from "../lead-schema-parser";

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
  version: number;
};

export type LeadDraft = Omit<LeadState, "id" | "version">;

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
  });
}
