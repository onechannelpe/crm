import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type CommercialInputRow = Selectable<
  Database["pipeline_lead_commercial_inputs"]
>;
export type NewCommercialInputRow = Insertable<
  Database["pipeline_lead_commercial_inputs"]
>;

export function createCommercialInputRepo(db: DatabaseExecutor) {
  return {
    findByLeadId(leadId: number) {
      return db
        .selectFrom("pipeline_lead_commercial_inputs")
        .selectAll()
        .where("lead_id", "=", leadId)
        .executeTakeFirst();
    },

    upsert(values: NewCommercialInputRow) {
      return db
        .insertInto("pipeline_lead_commercial_inputs")
        .values(values)
        .onConflict((oc) =>
          oc.column("lead_id").doUpdateSet({
            proveedor_actual: values.proveedor_actual,
            tasa_actual: values.tasa_actual,
            gpv: values.gpv,
            ticket: values.ticket,
            abono: values.abono,
            cantidad_pos: values.cantidad_pos,
            updated_at: values.updated_at,
            updated_by: values.updated_by,
          }),
        )
        .execute();
    },
  };
}
