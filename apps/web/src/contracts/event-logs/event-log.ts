import type { FieldChange } from "~/contracts/events";
import type { Json } from "~/contracts/json";

export const EVENT_LOG_TABLES = [
  "DOMAIN_EVENT",
  "ACTION_LOG",
  "AUTH_EVENT",
] as const;

export type EventLogTable = (typeof EVENT_LOG_TABLES)[number];
export type EventLogStatus = "ok" | "error";
export type JsonObject = { [key: string]: Json };

type EventLogRecordBase = {
  id: string;
  event: string;
  timestamp: number;
  properties: JsonObject;
};

export type DomainEventLogRecord = EventLogRecordBase & {
  table: "DOMAIN_EVENT";
  actorUserId: string | null;
  entity: { type: string; id: string };
  changes: FieldChange[];
};

export type ActionEventLogRecord = EventLogRecordBase & {
  table: "ACTION_LOG";
  actorUserId: string | null;
  status: EventLogStatus;
  durationMs: number;
};

export type AuthEventLogRecord = EventLogRecordBase & {
  table: "AUTH_EVENT";
  screen: string | null;
  method: string | null;
  outcome: string;
};

export type EventLogRecord =
  | DomainEventLogRecord
  | ActionEventLogRecord
  | AuthEventLogRecord;

export type EventLogRecordFor<T extends EventLogTable> = Extract<
  EventLogRecord,
  { table: T }
>;

export interface EventLogPageInfo {
  endCursor: string | null;
  hasNextPage: boolean;
}

export interface EventLogQueryResult {
  records: EventLogRecord[];
  totalCount: number;
  pageInfo: EventLogPageInfo;
}

export interface EventLogFilters {
  eventType?: string;
  actorUserId?: string;
  status?: EventLogStatus;
  onlyHighRisk?: boolean;
  dateRange?: { start?: number; end?: number };
}

export interface EventLogQueryInput {
  table: EventLogTable;
  filters?: EventLogFilters;
  first?: number;
  after?: string | null;
}

export interface EventLogCursor {
  timestamp: number;
  id: string;
}

export function isEventLogTable(value: string): value is EventLogTable {
  return EVENT_LOG_TABLES.some((table) => table === value);
}

export function isEventLogStatus(value: string): value is EventLogStatus {
  return value === "ok" || value === "error";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJson(value: unknown): value is Json {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJson);
  if (!isObject(value)) return false;
  return Object.values(value).every(isJson);
}

function isJsonObject(value: unknown): value is JsonObject {
  return isObject(value) && Object.values(value).every(isJson);
}

function isFieldChange(value: unknown): value is FieldChange {
  if (!isObject(value) || typeof value.field !== "string") return false;
  const isValue = (candidate: unknown) =>
    candidate === null ||
    typeof candidate === "string" ||
    typeof candidate === "number" ||
    typeof candidate === "boolean";
  return isValue(value.from) && isValue(value.to);
}

function hasBaseRecord(
  value: Record<string, unknown>,
): value is Record<string, unknown> & EventLogRecordBase {
  return (
    typeof value.id === "string" &&
    typeof value.event === "string" &&
    typeof value.timestamp === "number" &&
    Number.isFinite(value.timestamp) &&
    isJsonObject(value.properties)
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function parseEventLogRecord(value: unknown): EventLogRecord | null {
  if (!isObject(value) || !hasBaseRecord(value)) return null;

  if (value.table === "DOMAIN_EVENT") {
    if (!isNullableString(value.actorUserId) || !isObject(value.entity)) {
      return null;
    }
    if (
      typeof value.entity.type !== "string" ||
      typeof value.entity.id !== "string" ||
      !Array.isArray(value.changes) ||
      !value.changes.every(isFieldChange)
    ) {
      return null;
    }
    return {
      id: value.id,
      table: value.table,
      event: value.event,
      timestamp: value.timestamp,
      properties: value.properties,
      actorUserId: value.actorUserId,
      entity: { type: value.entity.type, id: value.entity.id },
      changes: value.changes,
    };
  }

  if (value.table === "ACTION_LOG") {
    if (
      !isNullableString(value.actorUserId) ||
      typeof value.status !== "string" ||
      !isEventLogStatus(value.status) ||
      typeof value.durationMs !== "number" ||
      !Number.isFinite(value.durationMs)
    ) {
      return null;
    }
    return {
      id: value.id,
      table: value.table,
      event: value.event,
      timestamp: value.timestamp,
      properties: value.properties,
      actorUserId: value.actorUserId,
      status: value.status,
      durationMs: value.durationMs,
    };
  }

  if (value.table !== "AUTH_EVENT") return null;
  if (
    !isNullableString(value.screen) ||
    !isNullableString(value.method) ||
    typeof value.outcome !== "string"
  ) {
    return null;
  }
  return {
    id: value.id,
    table: value.table,
    event: value.event,
    timestamp: value.timestamp,
    properties: value.properties,
    screen: value.screen,
    method: value.method,
    outcome: value.outcome,
  };
}

export function parseEventLogRecordText(raw: string): EventLogRecord | null {
  try {
    return parseEventLogRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function encodeEventLogCursor(cursor: EventLogCursor): string {
  return btoa(`${cursor.timestamp}:${cursor.id}`);
}

export function decodeEventLogCursor(raw: string): EventLogCursor | null {
  try {
    const decoded = atob(raw);
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    const timestamp = Number(decoded.slice(0, separator));
    const id = decoded.slice(separator + 1);
    if (!Number.isFinite(timestamp) || id.length === 0) return null;
    return { timestamp, id };
  } catch {
    return null;
  }
}
