import type { LeadId, UserId } from "../domain/lead-record";

export type LeadAuditRepository = {
  append(input: {
    actorUserId: UserId;
    action: string;
    entityId: LeadId;
    changes?: Record<string, unknown>;
  }): Promise<void>;
};
