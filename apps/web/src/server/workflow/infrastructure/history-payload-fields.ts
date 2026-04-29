import { isPlainRecord } from "~/lib/type-guards";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import {
  parseRequiredLeadPriority,
  parseRequiredLeadStage,
  parseRequiredLeadStatus,
  parseRequiredMoneda,
  parseRequiredAbonoBank,
} from "~/server/workflow/domain/lead-schema-parser";
import type {
  LeadCallOutcome,
  LeadPriority,
  LeadStage,
  LeadStatus,
  Moneda,
  AbonoBank,
  CulqiProductKind,
  ModalidadCobro,
} from "~/workflow/contracts/lead-schema";
import {
  isCulqiProductKind,
  isModalidadCobro,
} from "~/workflow/contracts/lead-schema";

import type { HistoryEventRow } from "./history-event-row";

function invalidPayload(row: HistoryEventRow, key?: string): never {
  throw new Error(
    key
      ? `Invalid history payload field "${key}" for event ${row.id} (${row.event_type})`
      : `Invalid history payload for event ${row.id} (${row.event_type})`,
  );
}

export function parsePayload(
  row: HistoryEventRow,
): Result<Record<string, unknown> | null, DomainError> {
  if (row.payload_json === null) {
    return Ok(null);
  }

  try {
    const value = JSON.parse(row.payload_json) as unknown;
    if (isPlainRecord(value)) {
      return Ok(value);
    }
  } catch {}

  return invalidPayload(row);
}

export function requireString(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): Result<string, DomainError> {
  const value = payload?.[key];
  if (typeof value === "string" && value.trim()) {
    return Ok(value);
  }

  return invalidPayload(row, key);
}

export function optionalString(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): Result<string | undefined, DomainError> {
  const value = payload?.[key];
  if (value === undefined || value === null) {
    return Ok(undefined);
  }
  if (typeof value === "string") {
    return Ok(value);
  }

  return invalidPayload(row, key);
}

export function nullableString(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): Result<string | null, DomainError> {
  const value = payload?.[key];
  if (value === null) {
    return Ok(null);
  }
  if (typeof value === "string") {
    return Ok(value);
  }

  return invalidPayload(row, key);
}

export function requireNumber(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): Result<number, DomainError> {
  const value = payload?.[key];
  if (typeof value === "number") {
    return Ok(value);
  }

  return invalidPayload(row, key);
}

export function requireLeadStage(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): Result<LeadStage, DomainError> {
  const value = requireString(payload, key, row);
  if (!value.ok) {
    return value;
  }

  const parsed = parseRequiredLeadStage(value.value);
  if (!parsed.ok) {
    return parsed;
  }
  return Ok(parsed.value);
}

export function requireLeadStatus(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): Result<LeadStatus, DomainError> {
  const value = requireString(payload, key, row);
  if (!value.ok) {
    return value;
  }

  const parsed = parseRequiredLeadStatus(value.value);
  if (!parsed.ok) {
    return parsed;
  }
  return Ok(parsed.value);
}

export function optionalLeadStatus(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): Result<LeadStatus | null, DomainError> {
  const value = payload?.[key];
  if (value === undefined || value === null) {
    return Ok(null);
  }
  if (typeof value !== "string") {
    invalidPayload(row, key);
  }

  const parsed = parseRequiredLeadStatus(value);
  if (!parsed.ok) {
    return parsed;
  }
  return Ok(parsed.value);
}

export function requireLeadPriority(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): Result<LeadPriority, DomainError> {
  const value = requireString(payload, key, row);
  if (!value.ok) {
    return value;
  }

  const parsed = parseRequiredLeadPriority(value.value);
  if (!parsed.ok) {
    return parsed;
  }
  return Ok(parsed.value);
}

export function optionalLeadPriority(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): Result<LeadPriority | null, DomainError> {
  const value = payload?.[key];
  if (value === undefined || value === null) {
    return Ok(null);
  }
  if (typeof value !== "string") {
    invalidPayload(row, key);
  }

  const parsed = parseRequiredLeadPriority(value);
  if (!parsed.ok) {
    return parsed;
  }
  return Ok(parsed.value);
}

export function requireCallOutcome(
  payload: Record<string, unknown> | null,
  row: HistoryEventRow,
): Result<LeadCallOutcome, DomainError> {
  const value = payload?.outcome;
  switch (value) {
    case "answered":
    case "no_answer":
    case "wrong_number":
    case "callback_requested":
    case "qualified":
    case "disqualified":
      return Ok(value);
    default:
      return invalidPayload(row, "outcome");
  }
}

export function requireMoneda(
  payload: Record<string, unknown> | null,
  row: HistoryEventRow,
): Result<Moneda, DomainError> {
  const value = requireString(payload, "moneda", row);
  if (!value.ok) return value;
  return parseRequiredMoneda(value.value);
}

export function requireAbonoBank(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): Result<AbonoBank, DomainError> {
  const value = requireString(payload, key, row);
  if (!value.ok) return value;
  return parseRequiredAbonoBank(value.value);
}

export function requireCulqiProductKind(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): Result<CulqiProductKind, DomainError> {
  const value = requireString(payload, key, row);
  if (!value.ok) return value;
  if (!isCulqiProductKind(value.value)) {
    return invalidPayload(row, key);
  }
  return Ok(value.value);
}

export function nullableModalidadCobro(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): Result<ModalidadCobro | null, DomainError> {
  const value = payload?.[key];
  if (value === null || value === undefined) {
    return Ok(null);
  }
  if (typeof value !== "string" || !isModalidadCobro(value)) {
    return invalidPayload(row, key);
  }
  return Ok(value);
}
