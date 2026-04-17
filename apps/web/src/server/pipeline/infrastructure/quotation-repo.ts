import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { LeadQuotation } from "~/server/pipeline/application/ports/quotation-repository";
import type { LeadId } from "~/server/pipeline/domain/lead-record";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type QuotationRow = Selectable<Database["pipeline_quotations"]>;
export type NewQuotationRow = Insertable<Database["pipeline_quotations"]>;

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
    async insert(values: Omit<LeadQuotation, "id">): Promise<number> {
      const result = await db
        .insertInto("pipeline_quotations")
        .values({
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

      return Number(result.insertId);
    },

    async listByLeadId(leadId: LeadId): Promise<LeadQuotation[]> {
      const rows = await db
        .selectFrom("pipeline_quotations")
        .selectAll()
        .where("lead_id", "=", leadId)
        .orderBy("version", "desc")
        .execute();

      return rows.map(toLeadQuotation);
    },

    async nextVersion(leadId: LeadId): Promise<number> {
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
