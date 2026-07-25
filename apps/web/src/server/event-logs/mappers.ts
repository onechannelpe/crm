import type { Selectable } from "kysely";

import type {
  ActionEventLogRecord,
  AuthEventLogRecord,
  DomainEventLogRecord,
  JsonObject,
} from "~/contracts/event-logs/event-log";
import { parseFieldChanges } from "~/contracts/events";
import type { Json } from "~/contracts/json";
import type { Database } from "~/server/platform/database/types";

type EventRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  type: string;
  actor_user_id: string | null;
  payload_json: Json | null;
  changes_json: Json | null;
  occurred_at: Date;
};

function toProperties(value: Json | null): JsonObject {
  if (value === null) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  return { value };
}

export function mapDomainEventRow(row: EventRow): DomainEventLogRecord {
  return {
    id: row.id,
    table: "DOMAIN_EVENT",
    event: row.type,
    timestamp: row.occurred_at.getTime(),
    actorUserId: row.actor_user_id,
    entity: { type: row.entity_type, id: row.entity_id },
    changes: parseFieldChanges(row.changes_json),
    properties: toProperties(row.payload_json),
  };
}

export function mapActionObservationRow(
  row: Selectable<Database["action_observations"]>,
): ActionEventLogRecord {
  return {
    id: row.id,
    table: "ACTION_LOG",
    event: row.action_name,
    timestamp: row.created_at.getTime(),
    actorUserId: row.actor_user_id,
    status: row.status,
    durationMs: row.duration_ms,
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
  };
}

export function mapAuthFunnelEventRow(
  row: Selectable<Database["auth_funnel_events"]>,
): AuthEventLogRecord {
  return {
    id: row.id,
    table: "AUTH_EVENT",
    event: row.event_name,
    timestamp: row.created_at.getTime(),
    screen: row.screen,
    method: row.method,
    outcome: row.outcome,
    properties: {
      source: row.source,
      routePath: row.route_path,
      code: row.code,
      traceId: row.trace_id,
    },
  };
}
