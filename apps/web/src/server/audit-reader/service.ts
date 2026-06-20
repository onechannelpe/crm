import type {
  AuditReaderFilterInput,
  AuditReaderSnapshot,
} from "~/contracts/audit-reader/snapshot";
import { parseFieldChanges } from "~/contracts/events";
import { invalid, type DomainError } from "~/server/shared/domain-error";
import type { createEventsRepo } from "~/server/shared/repos-events";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import {
  AUDIT_READER_DEFAULT_LIMIT,
  AUDIT_READER_DEFAULT_WINDOW_MINUTES,
  AUDIT_READER_MAX_LIMIT,
  AUDIT_READER_MAX_WINDOW_MINUTES,
} from "./limits";

interface AuditReaderDeps {
  events: ReturnType<typeof createEventsRepo>;
}

function trimOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

function parseWindowMinutes(value: number): Result<number, DomainError> {
  if (!Number.isInteger(value) || value < 1) {
    return Err(
      invalid({
        code: "invalid_window_minutes",
        details: { field: "window_minutes", rule: "positive_integer" },
      }),
    );
  }
  if (value > AUDIT_READER_MAX_WINDOW_MINUTES) {
    return Err(
      invalid({
        code: "invalid_window_minutes",
        details: {
          field: "window_minutes",
          rule: "max",
          max: AUDIT_READER_MAX_WINDOW_MINUTES,
          actual: value,
        },
      }),
    );
  }
  return Ok(value);
}

function parseLimit(value: number): Result<number, DomainError> {
  if (!Number.isInteger(value) || value < 1) {
    return Err(
      invalid({
        code: "invalid_limit",
        details: { field: "limit", rule: "positive_integer" },
      }),
    );
  }
  if (value > AUDIT_READER_MAX_LIMIT) {
    return Err(
      invalid({
        code: "invalid_limit",
        details: {
          field: "limit",
          rule: "max",
          max: AUDIT_READER_MAX_LIMIT,
          actual: value,
        },
      }),
    );
  }
  return Ok(value);
}

function parseActorUserId(value: number): Result<number, DomainError> {
  if (!Number.isInteger(value) || value < 1) {
    return Err(
      invalid({
        code: "invalid_actor_user_id",
        details: { field: "actor_user_id", rule: "positive_integer" },
      }),
    );
  }
  return Ok(value);
}

export function createAuditReaderService(deps: AuditReaderDeps) {
  return {
    async getSnapshot(
      params?: AuditReaderFilterInput,
    ): Promise<Result<AuditReaderSnapshot, DomainError>> {
      const parsedWindowMinutes = parseWindowMinutes(
        params?.windowMinutes ?? AUDIT_READER_DEFAULT_WINDOW_MINUTES,
      );
      if (isErr(parsedWindowMinutes)) return parsedWindowMinutes;

      const parsedLimit = parseLimit(
        params?.limit ?? AUDIT_READER_DEFAULT_LIMIT,
      );
      if (isErr(parsedLimit)) return parsedLimit;

      let actorUserId: number | undefined;
      if (params?.actorUserId !== undefined) {
        const parsedActorUserId = parseActorUserId(params.actorUserId);
        if (isErr(parsedActorUserId)) return parsedActorUserId;
        actorUserId = parsedActorUserId.value;
      }

      const windowMinutes = parsedWindowMinutes.value;
      const limit = parsedLimit.value;
      const now = Date.now();
      const fromInclusive = now - windowMinutes * 60 * 1000;
      const action = trimOrUndefined(params?.action);
      const entityType = trimOrUndefined(params?.entityType);

      const events = await deps.events.listRecent({
        fromInclusive,
        toInclusive: now,
        limit,
        action,
        entityType,
        actorUserId,
        onlyHighRisk: params?.onlyHighRisk ?? false,
      });

      return Ok({
        windowMinutes,
        events: events.map((row) => ({
          id: row.id,
          occurredAt: row.occurred_at,
          actorUserId: row.actor_user_id,
          type: row.type,
          entityType: row.entity_type,
          entityId: row.entity_id,
          changes: parseFieldChanges(row.changes_json),
          payload: row.payload_json,
        })),
      });
    },
  };
}
