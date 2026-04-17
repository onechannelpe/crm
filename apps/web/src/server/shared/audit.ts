import { serializeAuditChanges } from "~/lib/contracts/audit";

interface AuditLogWriter {
  create(values: {
    user_id: number;
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
      userId: number,
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
