import type { LeadId } from "../domain/lead-record";

export type LeadAuditRepository = {
  append(input: {
    actorUserId: number;
    action: string;
    entityId: LeadId;
    changes?: Record<string, unknown>;
  }): Promise<void>;
};
