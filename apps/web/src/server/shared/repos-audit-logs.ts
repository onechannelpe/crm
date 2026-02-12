import type { Kysely } from "kysely";
import type { Database, NewAuditLog } from "~/lib/db/schema";

export function createAuditLogsRepo(db: Kysely<Database>) {
    return {
        create(values: NewAuditLog) {
            return db.insertInto("audit_logs").values(values).executeTakeFirstOrThrow();
        },

        findByUser(userId: number, limit: number = 50) {
            return db
                .selectFrom("audit_logs")
                .selectAll()
                .where("user_id", "=", userId)
                .orderBy("created_at", "desc")
                .limit(limit)
                .execute();
        },

        findByEntity(entityType: string, entityId: number) {
            return db
                .selectFrom("audit_logs")
                .selectAll()
                .where("entity_type", "=", entityType)
                .where("entity_id", "=", entityId)
                .orderBy("created_at", "desc")
                .execute();
        },
    };
}
