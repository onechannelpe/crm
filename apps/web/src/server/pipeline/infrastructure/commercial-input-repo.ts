import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { LeadCommercialInput } from "~/server/pipeline/application/ports/commercial-input-repository";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type CommercialInputRow = Selectable<
  Database["workflow_lead_commercial_inputs"]
>;
export type NewCommercialInputRow = Insertable<
  Database["workflow_lead_commercial_inputs"]
>;

function toLeadCommercialInput(row: CommercialInputRow): LeadCommercialInput {
  return {
    leadId: row.lead_id,
    proveedorActual: row.proveedor_actual,
    tasaActual: row.tasa_actual,
    gpv: row.gpv,
    ticket: row.ticket,
    abono: row.abono,
    cantidadPos: row.cantidad_pos,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export function createCommercialInputRepo(db: DatabaseExecutor) {
  return {
    async findByLeadId(
      leadId: string,
    ): Promise<LeadCommercialInput | undefined> {
      const row = await db
        .selectFrom("workflow_lead_commercial_inputs")
        .selectAll()
        .where("lead_id", "=", leadId)
        .executeTakeFirst();

      return row ? toLeadCommercialInput(row) : undefined;
    },

    upsert(values: LeadCommercialInput) {
      return db
        .insertInto("workflow_lead_commercial_inputs")
        .values({
          lead_id: values.leadId,
          proveedor_actual: values.proveedorActual,
          tasa_actual: values.tasaActual,
          gpv: values.gpv,
          ticket: values.ticket,
          abono: values.abono,
          cantidad_pos: values.cantidadPos,
          updated_at: values.updatedAt,
          updated_by: values.updatedBy,
        } satisfies NewCommercialInputRow)
        .onConflict((oc) =>
          oc.column("lead_id").doUpdateSet({
            proveedor_actual: values.proveedorActual,
            tasa_actual: values.tasaActual,
            gpv: values.gpv,
            ticket: values.ticket,
            abono: values.abono,
            cantidad_pos: values.cantidadPos,
            updated_at: values.updatedAt,
            updated_by: values.updatedBy,
          }),
        )
        .execute();
    },
  };
}
