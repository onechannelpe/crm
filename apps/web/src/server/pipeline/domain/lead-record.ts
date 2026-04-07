import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";
import { Ok } from "~/server/shared/result";

import { normalizeLeadRuc } from "./lead-schema-parser";

export type LeadRecord = {
  id: number;
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
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
    "executiveId" | "stage" | "status" | "prioridad" | "updatedAt"
  >
>;

export function createLeadDraft(input: {
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
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
    executiveId: input.executiveId,
    stage: "PENDING_EXTERNAL_REVIEW",
    status: null,
    prioridad: null,
    createdAt: input.now,
    updatedAt: input.now,
  });
}
