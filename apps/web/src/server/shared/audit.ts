import { serializeAuditChanges } from "~/lib/contracts/audit";
import type { UserId } from "~/server/shared/ids";

interface AuditLogWriter {
  create(values: {
    user_id: UserId;
    action: string;
    entity_type: string;
    entity_id: string;
    changes: string | null;
    created_at: number;
  }): Promise<unknown>;
}

interface AuditDeps {
  auditLogs: AuditLogWriter;
}

export function createAuditService(deps: AuditDeps) {
  return {
    log(
      userId: UserId,
      action: string,
      entityType: string,
      entityId: string,
      changes?: unknown,
    ) {
      return deps.auditLogs.create({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        changes: serializeAuditChanges(changes),
        created_at: Date.now(),
      });
    },
  };
}
