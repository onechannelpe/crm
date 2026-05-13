import { randomUUIDv7 } from "bun";

import { serializeAuditChanges } from "~/contracts/audit";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type {
  AuditLogDraft,
  AuditLogRepository,
  WorkflowAuditService,
} from "../application/ports/audit-service";

export function createWorkflowAuditLogRepo(auditLogs: {
  create(values: {
    user_id: number;
    action: string;
    entity_type: string;
    entity_id: string;
    changes: string | null;
    created_at: number;
  }): Promise<unknown>;
}): AuditLogRepository {
  return {
    create(values: AuditLogDraft) {
      return auditLogs.create({
        user_id: values.userId,
        action: values.action,
        entity_type: values.entityType,
        entity_id: values.entityId,
        changes: values.changes,
        created_at: values.createdAt,
      });
    },
  };
}

export function createWorkflowAuditLogsRepo(executor: DatabaseExecutor) {
  return {
    create(values: {
      user_id: number;
      action: string;
      entity_type: string;
      entity_id: string;
      changes: string | null;
      created_at: number;
    }) {
      const id = randomUUIDv7("hex", values.created_at);
      return executor
        .insertInto("workflow_audit_logs")
        .values({ id, ...values })
        .executeTakeFirstOrThrow();
    },
  };
}

export function createWorkflowAuditService(deps: {
  auditLogs: AuditLogRepository;
}): WorkflowAuditService {
  return {
    log(actorUserId, action, entityType, entityId, changes) {
      return deps.auditLogs.create({
        userId: actorUserId,
        action,
        entityType,
        entityId,
        changes: serializeAuditChanges(changes),
        createdAt: Date.now(),
      });
    },
  };
}
