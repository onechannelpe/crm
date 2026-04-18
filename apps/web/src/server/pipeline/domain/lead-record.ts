import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";
import type { DomainError } from "~/server/shared/domain-error";
import {
  asLeadId,
  createLeadId,
  isLeadId,
  type LeadId,
  type UserId,
} from "~/server/shared/ids";
import type { Result } from "~/server/shared/result";
import { Ok } from "~/server/shared/result";

import { normalizeLeadRuc } from "./lead-schema-parser";

export type { LeadId, UserId };
export { asLeadId, createLeadId, isLeadId };

export type LeadRecord = {
  id: LeadId;
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  executiveId: UserId;
  createdBy: UserId;
  updatedBy: UserId | null;
  stage: LeadStage;
  status: LeadStatus | null;
  prioridad: LeadPriority | null;
  createdAt: number;
  updatedAt: number;
};

export type LeadDraft = Omit<LeadRecord, "id">;

export type LeadPatch = Partial<
  Pick<
    LeadRecord,
    | "razonSocial"
    | "address"
    | "district"
    | "department"
    | "executiveId"
    | "updatedBy"
    | "stage"
    | "status"
    | "prioridad"
    | "updatedAt"
  >
>;

export function createLeadDraft(input: {
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: UserId;
  createdBy: UserId;
  now: number;
}): Result<LeadDraft, DomainError> {
  const ruc = normalizeLeadRuc(input.ruc);
  if (!ruc.ok) {
    return ruc;
  }

  return Ok({
    ruc: ruc.value,
    razonSocial: input.razonSocial,
    address: input.address,
    district: null,
    department: null,
    executiveId: input.executiveId,
    createdBy: input.createdBy,
    updatedBy: null,
    stage: "PENDING_EXTERNAL_REVIEW",
    status: null,
    prioridad: null,
    createdAt: input.now,
    updatedAt: input.now,
  });
}
