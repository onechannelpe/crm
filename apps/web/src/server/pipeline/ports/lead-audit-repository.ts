export type LeadAuditRepository = {
  append(input: {
    actorUserId: number;
    action: string;
    entityId: number;
    changes?: Record<string, unknown>;
  }): Promise<void>;
};
