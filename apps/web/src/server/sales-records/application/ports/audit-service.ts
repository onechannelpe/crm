import type { UserId } from "~/server/shared/ids";

export interface SalesRecordAuditLogPort {
  create(values: {
    user_id: UserId;
    action: string;
    entity_type: string;
    entity_id: string;
    changes: string | null;
    created_at: number;
  }): Promise<unknown>;
}
