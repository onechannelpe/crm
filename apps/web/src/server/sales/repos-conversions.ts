import type { Kysely } from "kysely";

import type { Database, NewLeadSale } from "~/lib/db/types";

export function createLeadSalesRepo(db: Kysely<Database>) {
  return {
    async create(values: NewLeadSale): Promise<number> {
      const result = await db
        .insertInto("crm_sales")
        .values(values)
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    },

    findById(id: number) {
      return db
        .selectFrom("crm_sales")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    findByLeadId(leadId: number) {
      return db
        .selectFrom("crm_sales")
        .selectAll()
        .where("lead_id", "=", leadId)
        .executeTakeFirst();
    },

    listByExecutive(executiveId: number, limit: number, offset: number) {
      return db
        .selectFrom("crm_sales")
        .selectAll()
        .where("executive_id", "=", executiveId)
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset)
        .execute();
    },

    list(limit: number, offset: number) {
      return db
        .selectFrom("crm_sales")
        .selectAll()
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset)
        .execute();
    },
  };
}
