export const EVENT_LOG_TABLES = [
  "DOMAIN_EVENT",
  "ACTION_LOG",
  "AUTH_EVENT",
] as const;

export type EventLogTable = (typeof EVENT_LOG_TABLES)[number];

export function isEventLogTable(value: string): value is EventLogTable {
  return (EVENT_LOG_TABLES as readonly string[]).includes(value);
}

export interface EventLogRecord {
  id: string;
  table: EventLogTable;
  event: string;
  timestamp: number;
  userId: string | null;
  properties: Record<string, unknown> | null;
  entityType: string | null;
  entityId: string | null;
  changesSummary: string | null;
  status: string | null;
  durationMs: number | null;
  screen: string | null;
  method: string | null;
  outcome: string | null;
}

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
  status?: string;
  onlyHighRisk?: boolean;
  dateRange?: { start?: number; end?: number };
}

export interface EventLogQueryInput {
  table: EventLogTable;
  filters?: EventLogFilters;
  first?: number;
  after?: string | null;
}

// Keyset cursor over (timestamp, id): a time-ordered page marker that survives
// inserts, unlike an offset. Encoded opaque so the client treats it as a token.
export interface EventLogCursor {
  timestamp: number;
  id: string;
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
