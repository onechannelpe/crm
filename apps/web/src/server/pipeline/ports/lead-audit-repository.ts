export type LeadAuditRepository = {
  append(input: {
    actorUserId: number;
    action: string;
    entityId: string;
    changes?: Record<string, unknown>;
  }): Promise<void>;
};
