import type { Insertable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { AuditReaderQueryFilter } from "~/server/audit-reader/contracts";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

type NewAuditLogRow = Insertable<Database["audit_logs"]>;

export function createAuditLogsRepo(db: DatabaseExecutor) {
  return {
    create(values: NewAuditLogRow) {
      return db
        .insertInto("audit_logs")
        .values(values)
        .executeTakeFirstOrThrow();
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

    findByEntity(entityType: string, entityId: string) {
      return db
        .selectFrom("audit_logs")
        .selectAll()
        .where("entity_type", "=", entityType)
        .where("entity_id", "=", entityId)
        .orderBy("created_at", "desc")
        .execute();
    },

    async listRecent(filter: AuditReaderQueryFilter) {
      if (filter.onlyHighRisk) {
        let query = db
          .selectFrom("audit_logs")
          .leftJoin(
            "audit_action_policies as policy",
            "policy.action",
            "audit_logs.action",
          )
          .selectAll("audit_logs")
          .where("audit_logs.created_at", ">=", filter.fromInclusive)
          .where("audit_logs.created_at", "<=", filter.toInclusive)
          .where((eb) =>
            eb.or([
              eb("policy.action", "is", null),
              eb.and([
                eb("policy.risk_level", "=", "high"),
                eb("policy.is_active", "=", 1),
              ]),
            ]),
          )
          .orderBy("audit_logs.created_at", "desc")
          .limit(filter.limit);

        if (filter.action) {
          query = query.where("audit_logs.action", "=", filter.action);
        }
        if (filter.entityType) {
          query = query.where("audit_logs.entity_type", "=", filter.entityType);
        }
        if (filter.actorUserId !== undefined) {
          query = query.where("audit_logs.user_id", "=", filter.actorUserId);
        }

        return query.execute();
      }

      let query = db
        .selectFrom("audit_logs")
        .selectAll()
        .where("created_at", ">=", filter.fromInclusive)
        .where("created_at", "<=", filter.toInclusive)
        .orderBy("created_at", "desc")
        .limit(filter.limit);

      if (filter.action) {
        query = query.where("action", "=", filter.action);
      }
      if (filter.entityType) {
        query = query.where("entity_type", "=", filter.entityType);
      }
      if (filter.actorUserId !== undefined) {
        query = query.where("user_id", "=", filter.actorUserId);
      }

      return query.execute();
    },
  };
}

export type AuditLogsRepo = ReturnType<typeof createAuditLogsRepo>;
