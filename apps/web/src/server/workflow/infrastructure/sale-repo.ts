import { randomUUIDv7 } from "bun";
import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { LeadSale } from "~/server/workflow/application/ports/sale-repository";

export type SaleRow = Selectable<Database["workflow_sales"]>;
export type NewSaleRow = Insertable<Database["workflow_sales"]>;

function toLeadSale(row: SaleRow): LeadSale {
  return {
    id: row.id,
    leadId: row.lead_id,
    executiveId: row.executive_id,
    createdAt: row.created_at,
  };
}

export function createSaleRepo(db: DatabaseExecutor) {
  return {
    async insert(values: Omit<LeadSale, "id">): Promise<string> {
      const id = randomUUIDv7();
      await db
        .insertInto("workflow_sales")
        .values({
          id,
          lead_id: values.leadId,
          executive_id: values.executiveId,
          created_at: values.createdAt,
        } satisfies NewSaleRow)
        .executeTakeFirstOrThrow();

      return id;
    },

    async findById(id: string): Promise<LeadSale | undefined> {
      const row = await db
        .selectFrom("workflow_sales")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      return row ? toLeadSale(row) : undefined;
    },

    async findByLeadId(leadId: string): Promise<LeadSale | undefined> {
      const row = await db
        .selectFrom("workflow_sales")
        .selectAll()
        .where("lead_id", "=", leadId)
        .orderBy("created_at", "desc")
        .executeTakeFirst();

      return row ? toLeadSale(row) : undefined;
    },

    async list(limit: number, offset: number): Promise<LeadSale[]> {
      const rows = await db
        .selectFrom("workflow_sales")
        .selectAll()
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset)
        .execute();

      return rows.map(toLeadSale);
    },

    async listByExecutive(
      executiveId: number,
      limit: number,
      offset: number,
    ): Promise<LeadSale[]> {
      const rows = await db
        .selectFrom("workflow_sales")
        .selectAll()
        .where("executive_id", "=", executiveId)
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset)
        .execute();

      return rows.map(toLeadSale);
    },
  };
}
