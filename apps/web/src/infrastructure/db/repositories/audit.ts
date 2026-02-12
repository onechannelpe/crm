import { db } from "../client";
import type { NewAuditLog } from "../schema";

export class AuditRepository {
  static async log(entry: NewAuditLog): Promise<void> {
    await db
      .insertInto("audit_logs")
      .values(entry)
      .execute();
  }

  static async logAction(
    userId: number,
    action: string,
    entityType: string,
    entityId: number,
    changes?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      changes: changes ? JSON.stringify(changes) : null,
      created_at: Date.now(),
    });
  }
}
