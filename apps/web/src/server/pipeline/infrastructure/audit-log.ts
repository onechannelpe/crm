import { serializeAuditChanges } from "~/lib/contracts/audit";

import type {
  AuditLogDraft,
  AuditLogRepository,
  PipelineAuditService,
} from "../application/ports/audit-service";

export function createPipelineAuditLogRepo(auditLogs: {
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

export function createPipelineAuditService(deps: {
  auditLogs: AuditLogRepository;
}): PipelineAuditService {
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
