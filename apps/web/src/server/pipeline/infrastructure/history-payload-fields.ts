import { isPlainRecord } from "~/lib/type-guards";
import type {
  LeadCallOutcome,
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";
import {
  parseRequiredLeadPriority,
  parseRequiredLeadStage,
  parseRequiredLeadStatus,
} from "~/server/pipeline/domain/lead-schema-parser";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import {
  asLeadId,
  asUserId,
  type LeadId,
  type UserId,
} from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { HistoryEventRow } from "./history-event-row";

function invalidPayload(row: HistoryEventRow, key?: string): DomainError {
  return domainError(
    "unexpected",
    "invalid_history_payload",
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

  return Err(invalidPayload(row));
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

  return Err(invalidPayload(row, key));
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

  return Err(invalidPayload(row, key));
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

  return Err(invalidPayload(row, key));
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

  return Err(invalidPayload(row, key));
}

export function requireUserId(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): Result<UserId, DomainError> {
  const value = requireString(payload, key, row);
  if (!value.ok) return value;
  return Ok(asUserId(value.value));
}

export function optionalUserId(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): Result<UserId | null, DomainError> {
  const value = optionalString(payload, key, row);
  if (!value.ok) return value;
  return Ok(value.value ? asUserId(value.value) : null);
}

export function requireLeadId(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): Result<LeadId, DomainError> {
  const value = requireString(payload, key, row);
  if (!value.ok) return value;
  return Ok(asLeadId(value.value));
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
    return Err(invalidPayload(row, key));
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
    return Err(invalidPayload(row, key));
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
      return Err(invalidPayload(row, "outcome"));
  }
}

export function requireCurrency(
  payload: Record<string, unknown> | null,
  row: HistoryEventRow,
): Result<"PEN" | "USD", DomainError> {
  if (payload?.moneda === "PEN" || payload?.moneda === "USD") {
    return Ok(payload.moneda);
  }

  return Err(invalidPayload(row, "moneda"));
}
