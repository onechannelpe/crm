import { brand, type Brand } from "~/lib/types/brand";
import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";
import { Ok } from "~/server/shared/result";

import { normalizeLeadRuc } from "./lead-schema-parser";

export type LeadId = Brand<string, "LeadId">;

// Trusted boundary: only call from DB read paths and createLeadId.
export const asLeadId = (id: string): LeadId => brand<string, "LeadId">(id);

export function createLeadId(): LeadId {
  return asLeadId(crypto.randomUUID());
}

export function isLeadId(value: string): value is LeadId {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export type LeadRecord = {
  id: LeadId;
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
  executiveId: number;
  createdBy: number;
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
