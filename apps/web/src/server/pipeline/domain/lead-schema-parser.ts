import { brand, type Brand } from "~/lib/types/brand";
import {
  LEAD_PRIORITIES,
  LEAD_STAGES,
  LEAD_STATUSES,
  type LeadPriority,
  type LeadStage,
  type LeadStatus,
} from "~/pipeline/contracts/lead-schema";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

export type Ruc = Brand<string, "Ruc">;

function fail(code: string, message: string): Result<never, DomainError> {
  return Err(domainError("validation", code, message));
}

export function normalizeLeadRuc(ruc: string): Result<Ruc, DomainError> {
  const normalizedRuc = ruc.trim();
  if (!/^\d{11}$/.test(normalizedRuc)) {
    return fail(
      "invalid_ruc",
      "El RUC debe tener 11 dígitos. Intenta nuevamente.",
    );
  }

  return Ok(brand<string, "Ruc">(normalizedRuc));
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
