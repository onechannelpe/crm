import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type SaleRow = Selectable<Database["pipeline_sales"]>;
export type NewSaleRow = Insertable<Database["pipeline_sales"]>;

export function createSaleRepo(db: DatabaseExecutor) {
  return {
    async insert(values: NewSaleRow): Promise<number> {
      const result = await db
        .insertInto("pipeline_sales")
        .values(values)
        .executeTakeFirstOrThrow();

      return Number(result.insertId);
    },

    findById(id: number) {
      return db
        .selectFrom("pipeline_sales")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    findByRecord(leadId: number) {
      return db
        .selectFrom("pipeline_sales")
        .selectAll()
        .where("lead_id", "=", leadId)
        .orderBy("created_at", "desc")
        .executeTakeFirst();
    },

    list(limit: number, offset: number) {
      return db
        .selectFrom("pipeline_sales")
        .selectAll()
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset)
        .execute();
    },

    listByExecutive(executiveId: number, limit: number, offset: number) {
      return db
        .selectFrom("pipeline_sales")
        .selectAll()
        .where("executive_id", "=", executiveId)
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset)
        .execute();
    },
  };
}
