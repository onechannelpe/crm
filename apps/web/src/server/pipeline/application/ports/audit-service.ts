export type AuditLogDraft = {
  userId: number;
  action: string;
  entityType: string;
  entityId: number;
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
    entityId: number,
    changes?: Record<string, unknown>,
  ): Promise<unknown>;
};
