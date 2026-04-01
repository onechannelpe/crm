import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type LeadCommercialInputRow = Selectable<
  Database["pipeline_lead_commercial_inputs"]
>;
export type NewLeadCommercialInputRow = Insertable<
  Database["pipeline_lead_commercial_inputs"]
>;

export function createLeadCommercialInputRepo(db: DatabaseExecutor) {
  return {
    async upsert(values: NewLeadCommercialInputRow): Promise<void> {
      await db
        .insertInto("pipeline_lead_commercial_inputs")
        .values(values)
        .onConflict((oc) =>
          oc.column("lead_id").doUpdateSet({
            proveedor_actual: values.proveedor_actual ?? null,
            tasa_actual: values.tasa_actual ?? null,
            gpv: values.gpv ?? null,
            ticket: values.ticket ?? null,
            abono: values.abono ?? null,
            cantidad_pos: values.cantidad_pos ?? null,
            updated_at: values.updated_at,
            updated_by: values.updated_by,
          }),
        )
        .execute();
    },

    findByLeadId(leadId: number) {
      return db
        .selectFrom("pipeline_lead_commercial_inputs")
        .selectAll()
        .where("lead_id", "=", leadId)
        .executeTakeFirst();
    },
  };
}
