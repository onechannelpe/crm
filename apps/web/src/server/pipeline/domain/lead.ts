import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

export const LEAD_STAGES = [
  "PENDING_EXTERNAL_REVIEW",
  "REJECTED_BY_STATUS",
  "NEEDS_EXECUTIVE_INPUT",
  "READY_FOR_QUOTATION",
  "QUOTED",
  "READY_FOR_SALE",
  "CONVERTED",
] as const;

export const LEAD_STATUSES = [
  "DISPONIBLE",
  "SIN RESULTADO",
  "CARTERIZADO",
  "STOCK",
] as const;

export const LEAD_PRIORITIES = ["P1", "P2", "SIN RESULTADO"] as const;

export const LEAD_CALL_OUTCOMES = [
  "answered",
  "no_answer",
  "wrong_number",
  "callback_requested",
  "qualified",
  "disqualified",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export type LeadCallOutcome = (typeof LEAD_CALL_OUTCOMES)[number];

export type Lead = {
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

export type LeadDraft = Omit<Lead, "id">;

export type LeadPatch = Partial<
  Pick<Lead, "executiveId" | "stage" | "status" | "prioridad" | "updatedAt">
>;

function fail(code: string, message: string): Result<never, DomainError> {
  return Err(domainError("validation", code, message));
}

export function normalizeLeadRuc(ruc: string): Result<string, DomainError> {
  const normalizedRuc = ruc.trim();
  if (!/^\d{11}$/.test(normalizedRuc)) {
    return fail("invalid_ruc", "RUC must be an 11 digit string");
  }

  return Ok(normalizedRuc);
}

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

function parseOptionalLeadValue<TValue extends string>(
  value: string | undefined,
  options: readonly TValue[],
  errorCode: string,
  message: string,
): Result<TValue | undefined, DomainError> {
  if (value === undefined) {
    return Ok(undefined);
  }

  const parsed = options.find((option) => option === value);
  if (!parsed) {
    return fail(errorCode, message);
  }

  return Ok(parsed);
}

function parseRequiredLeadValue<TValue extends string>(
  value: string,
  options: readonly TValue[],
  errorCode: string,
  message: string,
): Result<TValue, DomainError> {
  const parsed = parseOptionalLeadValue(value, options, errorCode, message);
  if (!parsed.ok) {
    return parsed;
  }
  if (parsed.value === undefined) {
    return fail(errorCode, message);
  }

  return Ok(parsed.value);
}

export function parseLeadStage(
  value: string | undefined,
): Result<LeadStage | undefined, DomainError> {
  return parseOptionalLeadValue(
    value,
    LEAD_STAGES,
    "invalid_stage",
    "Invalid stage filter",
  );
}

export function parseLeadStatus(
  value: string | undefined,
): Result<LeadStatus | undefined, DomainError> {
  return parseOptionalLeadValue(
    value,
    LEAD_STATUSES,
    "invalid_status",
    "Invalid status filter",
  );
}

export function parseLeadPriority(
  value: string | undefined,
): Result<LeadPriority | undefined, DomainError> {
  return parseOptionalLeadValue(
    value,
    LEAD_PRIORITIES,
    "invalid_prioridad",
    "Invalid prioridad filter",
  );
}

export function parseRequiredLeadStatus(
  value: string,
): Result<LeadStatus, DomainError> {
  return parseRequiredLeadValue(
    value,
    LEAD_STATUSES,
    "invalid_status",
    "Invalid status",
  );
}

export function parseRequiredLeadStage(
  value: string,
): Result<LeadStage, DomainError> {
  return parseRequiredLeadValue(
    value,
    LEAD_STAGES,
    "invalid_stage",
    "Invalid stage",
  );
}

export function parseRequiredLeadPriority(
  value: string,
): Result<LeadPriority, DomainError> {
  return parseRequiredLeadValue(
    value,
    LEAD_PRIORITIES,
    "invalid_prioridad",
    "Invalid prioridad",
  );
}
