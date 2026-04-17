import type { LeadId } from "../../domain/lead-record";

export type AuditLogDraft = {
  userId: number;
  action: string;
  entityType: string;
  entityId: LeadId;
  changes: string | null;
  createdAt: number;
};

export type AuditLogRepository = {
  create(values: AuditLogDraft): Promise<unknown>;
};

export type PipelineAuditService = {
  log(
    actorUserId: number,
    action: string,
    entity: string,
    entityId: LeadId,
    changes?: Record<string, unknown>,
  ): Promise<unknown>;
};
