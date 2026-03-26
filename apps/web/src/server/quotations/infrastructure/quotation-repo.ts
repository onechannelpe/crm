import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type QuotationRow = Selectable<Database["pipeline_quotations"]>;
export type NewQuotationRow = Insertable<Database["pipeline_quotations"]>;

export function createQuotationRepo(db: DatabaseExecutor) {
  return {
    async insert(values: NewQuotationRow): Promise<number> {
      const result = await db
        .insertInto("pipeline_quotations")
        .values(values)
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    },

    findById(id: number) {
      return db
        .selectFrom("pipeline_quotations")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    listByLead(leadId: number) {
      return db
        .selectFrom("pipeline_quotations")
        .selectAll()
        .where("lead_id", "=", leadId)
        .orderBy("version", "desc")
        .execute();
    },

    async nextVersion(leadId: number): Promise<number> {
      const row = await db
        .selectFrom("pipeline_quotations")
        .select("version")
        .where("lead_id", "=", leadId)
        .orderBy("version", "desc")
        .limit(1)
        .executeTakeFirst();
      return (row?.version ?? 0) + 1;
    },
  };
}
