import { assertPositiveInt } from "~/lib/contracts/guards";
import { asUserId, isUserId, type UserId } from "~/server/shared/ids";
import type { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";

import {
  AUDIT_READER_DEFAULT_LIMIT,
  AUDIT_READER_DEFAULT_WINDOW_MINUTES,
  AUDIT_READER_MAX_LIMIT,
  AUDIT_READER_MAX_WINDOW_MINUTES,
  type AuditReaderFilterInput,
  type AuditReaderSnapshot,
} from "./contracts";

interface AuditReaderDeps {
  auditLogs: ReturnType<typeof createAuditLogsRepo>;
}

function trimOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

function parseAuditUserId(value: string): UserId {
  if (!isUserId(value)) {
    throw new Error("audit event row has invalid user_id");
  }
  return asUserId(value);
}

export function createAuditReaderService(deps: AuditReaderDeps) {
  return {
    async getSnapshot(
      params?: AuditReaderFilterInput,
    ): Promise<AuditReaderSnapshot> {
      const windowMinutes = assertPositiveInt(
        params?.windowMinutes ?? AUDIT_READER_DEFAULT_WINDOW_MINUTES,
        "windowMinutes",
      );
      if (windowMinutes > AUDIT_READER_MAX_WINDOW_MINUTES) {
        throw new Error("windowMinutes must be <= 43200");
      }

      const limit = assertPositiveInt(
        params?.limit ?? AUDIT_READER_DEFAULT_LIMIT,
        "limit",
      );
      if (limit > AUDIT_READER_MAX_LIMIT) {
        throw new Error("limit must be <= 200");
      }

      let actorUserId: UserId | undefined;
      if (params?.actorUserId !== undefined) {
        if (!isUserId(params.actorUserId)) {
          throw new Error("actorUserId is invalid");
        }
        actorUserId = asUserId(params.actorUserId);
      }

      const now = Date.now();
      const fromInclusive = now - windowMinutes * 60 * 1000;
      const action = trimOrUndefined(params?.action);
      const entityType = trimOrUndefined(params?.entityType);

      const events = await deps.auditLogs.listRecent({
        fromInclusive,
        toInclusive: now,
        limit,
        action,
        entityType,
        actorUserId,
        onlyHighRisk: params?.onlyHighRisk ?? false,
      });

      return {
        windowMinutes,
        events: events.map((row) => ({
          id: Number(row.id),
          createdAt: row.created_at,
          userId: parseAuditUserId(row.user_id),
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          changes: row.changes,
        })),
      };
    },
  };
}
