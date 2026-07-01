import type {
  AuditReaderFilterInput,
  AuditReaderSnapshot,
} from "~/contracts/audit-reader/snapshot";
import { parseFieldChanges } from "~/contracts/events";
import { invalid, type DomainError } from "~/server/shared/domain-error";
import { asUserId, type UserId } from "~/server/shared/ids";
import {
  parsePositiveIntegerAtMost,
  trimOrUndefined,
} from "~/server/shared/query-window";
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

function parseWindowMinutes(value: number): Result<number, DomainError> {
  return parsePositiveIntegerAtMost(value, {
    code: "invalid_window_minutes",
    field: "window_minutes",
    max: AUDIT_READER_MAX_WINDOW_MINUTES,
  });
}

function parseLimit(value: number): Result<number, DomainError> {
  return parsePositiveIntegerAtMost(value, {
    code: "invalid_limit",
    field: "limit",
    max: AUDIT_READER_MAX_LIMIT,
  });
}

function parseActorUserId(value: string): Result<UserId, DomainError> {
  const trimmed = value.trim();
  if (!trimmed) {
    return Err(
      invalid({
        code: "invalid_actor_user_id",
        details: { field: "actor_user_id", rule: "non_empty_string" },
      }),
    );
  }
  return Ok(asUserId(trimmed));
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

      let actorUserId: UserId | undefined;
      if (params?.actorUserId !== undefined) {
        const parsedActorUserId = parseActorUserId(params.actorUserId);
        if (isErr(parsedActorUserId)) return parsedActorUserId;
        actorUserId = parsedActorUserId.value;
      }

      const windowMinutes = parsedWindowMinutes.value;
      const limit = parsedLimit.value;
      const now = new Date();
      const fromInclusive = new Date(now.getTime() - windowMinutes * 60 * 1000);
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
          occurredAt: row.occurred_at.getTime(),
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
