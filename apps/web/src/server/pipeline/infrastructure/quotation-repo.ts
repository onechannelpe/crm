import { randomUUIDv7 } from "bun";
import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { LeadQuotation } from "~/server/pipeline/application/ports/quotation-repository";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type QuotationRow = Selectable<Database["workflow_quotations"]>;
export type NewQuotationRow = Insertable<Database["workflow_quotations"]>;

function toLeadQuotation(row: QuotationRow): LeadQuotation {
  return {
    id: row.id,
    leadId: row.lead_id,
    paybackPricing: row.payback_pricing,
    tarifaDebito: row.tarifa_debito,
    tarifaCredito: row.tarifa_credito,
    tarifaForaneo: row.tarifa_foraneo,
    fee: row.fee,
    moneda: row.moneda,
    version: row.version,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export function createQuotationRepo(db: DatabaseExecutor) {
  return {
    async insert(values: Omit<LeadQuotation, "id">): Promise<string> {
      const id = randomUUIDv7();
      await db
        .insertInto("workflow_quotations")
        .values({
          id,
          lead_id: values.leadId,
          payback_pricing: values.paybackPricing,
          tarifa_debito: values.tarifaDebito,
          tarifa_credito: values.tarifaCredito,
          tarifa_foraneo: values.tarifaForaneo,
          fee: values.fee,
          moneda: values.moneda,
          version: values.version,
          created_at: values.createdAt,
          created_by: values.createdBy,
        } satisfies NewQuotationRow)
        .executeTakeFirstOrThrow();

      return id;
    },

    async listByLeadId(leadId: string): Promise<LeadQuotation[]> {
      const rows = await db
        .selectFrom("workflow_quotations")
        .selectAll()
        .where("lead_id", "=", leadId)
        .orderBy("version", "desc")
        .execute();

      return rows.map(toLeadQuotation);
    },

    async nextVersion(leadId: string): Promise<number> {
      const row = await db
        .selectFrom("workflow_quotations")
        .select("version")
        .where("lead_id", "=", leadId)
        .orderBy("version", "desc")
        .limit(1)
        .executeTakeFirst();

      return (row?.version ?? 0) + 1;
    },
  };
}
