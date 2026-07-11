import type { Selectable } from "kysely";

import type { EventLogRecord } from "~/contracts/event-logs/event-log";
import { parseFieldChanges, summarizeFieldChanges } from "~/contracts/events";
import type { Database } from "~/lib/db/types";

// Structural (unbranded) shape so both a persisted Selectable<events> row and a
// freshly-built insert row (id/actor as plain strings) map without brand casts.
type EventRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  type: string;
  actor_user_id: string | null;
  payload_json: unknown;
  changes_json: unknown;
  occurred_at: Date;
};
type ActionObservationRow = Selectable<Database["action_observations"]>;
type AuthFunnelEventRow = Selectable<Database["auth_funnel_events"]>;

function toProperties(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    return { value };
  }
  return value as Record<string, unknown>;
}

export function mapDomainEventRow(row: EventRow): EventLogRecord {
  const changes = parseFieldChanges(row.changes_json);
  return {
    id: row.id,
    table: "DOMAIN_EVENT",
    event: row.type,
    timestamp: row.occurred_at.getTime(),
    userId: row.actor_user_id,
    properties: toProperties(row.payload_json),
    entityType: row.entity_type,
    entityId: row.entity_id,
    changesSummary: changes.length > 0 ? summarizeFieldChanges(changes) : null,
    status: null,
    durationMs: null,
    screen: null,
    method: null,
    outcome: null,
  };
}

export function mapActionObservationRow(
  row: ActionObservationRow,
): EventLogRecord {
  return {
    id: row.id,
    table: "ACTION_LOG",
    event: row.action_name,
    timestamp: row.created_at.getTime(),
    userId: row.actor_user_id,
    properties: {
      routePath: row.route_path,
      httpMethod: row.http_method,
      actorRole: row.actor_role,
      errorCode: row.error_code,
      errorCategory: row.error_category,
      publicError: row.public_error,
      traceId: row.trace_id,
      inputSummary: row.input_summary,
    },
    entityType: null,
    entityId: null,
    changesSummary: null,
    status: row.status,
    durationMs: row.duration_ms,
    screen: null,
    method: null,
    outcome: null,
  };
}

export function mapAuthFunnelEventRow(row: AuthFunnelEventRow): EventLogRecord {
  return {
    id: row.id,
    table: "AUTH_EVENT",
    event: row.event_name,
    timestamp: row.created_at.getTime(),
    userId: null,
    properties: {
      source: row.source,
      routePath: row.route_path,
      code: row.code,
      traceId: row.trace_id,
    },
    entityType: null,
    entityId: null,
    changesSummary: null,
    status: null,
    durationMs: null,
    screen: row.screen,
    method: row.method,
    outcome: row.outcome,
  };
}
