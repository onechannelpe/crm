export type AuditLogDraft = {
  userId: number;
  action: string;
  entityType: string;
  entityId: string;
  changes: string | null;
  createdAt: number;
};

export type AuditLogRepository = {
  create(values: AuditLogDraft): Promise<unknown>;
};

export type WorkflowAuditService = {
  log(
    actorUserId: number,
    action: string,
    entity: string,
    entityId: string,
    changes?: Record<string, unknown>,
  ): Promise<unknown>;
};
