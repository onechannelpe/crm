import type { Kysely } from "kysely";

import type { Database, NewQuotation } from "~/lib/db/types";

export function createQuotationsRepo(db: Kysely<Database>) {
  return {
    async create(values: NewQuotation): Promise<number> {
      const result = await db
        .insertInto("crm_quotations")
        .values(values)
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    },

    findById(id: number) {
      return db
        .selectFrom("crm_quotations")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    latestForLead(leadId: number) {
      return db
        .selectFrom("crm_quotations")
        .selectAll()
        .where("lead_id", "=", leadId)
        .orderBy("version", "desc")
        .limit(1)
        .executeTakeFirst();
    },

    listByLead(leadId: number) {
      return db
        .selectFrom("crm_quotations")
        .selectAll()
        .where("lead_id", "=", leadId)
        .orderBy("version", "desc")
        .execute();
    },

    async nextVersion(leadId: number): Promise<number> {
      const latest = await db
        .selectFrom("crm_quotations")
        .select("version")
        .where("lead_id", "=", leadId)
        .orderBy("version", "desc")
        .limit(1)
        .executeTakeFirst();
      return (latest?.version ?? 0) + 1;
    },
  };
}
