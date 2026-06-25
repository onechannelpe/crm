import {
  CLOSE_REASONS,
  LEAD_PRIORITIES,
  LEAD_STAGES,
  LEAD_STATUSES,
  CURRENCIES,
  type CloseReason,
  type LeadPriority,
  type LeadStage,
  type LeadStatus,
  type Currency,
} from "~/contracts/workflow/vocabulary";
import { isPlainRecord } from "~/lib/type-guards";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import { invalidHistoryPayload } from "~/server/workflow/lead/domain/integrity-errors";
import { parseVocabularyValue } from "~/server/workflow/lead/domain/parse";

import type { HistoryEventRow } from "./history-event-row";

function invalidPayload(
  row: HistoryEventRow,
  key?: string,
): Result<never, DomainError> {
  return invalidHistoryPayload({ id: row.id, eventType: row.event_type }, key);
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

  const parsed = parseVocabularyValue(
    value.value,
    LEAD_STAGES,
    "invalid_stage",
  );
  if (!parsed.ok) {
    return parsed;
  }
  return Ok(parsed.value);
}

export function requireCloseReason(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): Result<CloseReason, DomainError> {
  const value = requireString(payload, key, row);
  if (!value.ok) {
    return value;
  }

  return parseVocabularyValue(
    value.value,
    CLOSE_REASONS,
    "invalid_close_reason",
  );
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

  const parsed = parseVocabularyValue(
    value.value,
    LEAD_STATUSES,
    "invalid_status",
  );
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
    return invalidPayload(row, key);
  }

  const parsed = parseVocabularyValue(value, LEAD_STATUSES, "invalid_status");
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

  const parsed = parseVocabularyValue(
    value.value,
    LEAD_PRIORITIES,
    "invalid_prioridad",
  );
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
    return invalidPayload(row, key);
  }

  const parsed = parseVocabularyValue(
    value,
    LEAD_PRIORITIES,
    "invalid_prioridad",
  );
  if (!parsed.ok) {
    return parsed;
  }
  return Ok(parsed.value);
}

export function requireMoneda(
  payload: Record<string, unknown> | null,
  row: HistoryEventRow,
): Result<Currency, DomainError> {
  const value = requireString(payload, "currency", row);
  if (!value.ok) return value;
  return parseVocabularyValue(value.value, CURRENCIES, "invalid_moneda");
}
