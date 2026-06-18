import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { LeadProfile } from "~/server/workflow/application/ports/entities";

type LeadProfileRow = Selectable<Database["workflow_lead_profiles"]>;
type NewLeadProfileRow = Insertable<Database["workflow_lead_profiles"]>;

function toLeadProfile(row: LeadProfileRow): LeadProfile {
  return {
    leadId: row.lead_id,
    proveedorActual: row.proveedor_actual,
    tasaDebitoActual: row.tasa_debito_actual,
    tasaCreditoActual: row.tasa_credito_actual,
    gpv: row.gpv,
    ticket: row.ticket,
    linkScope: row.link_scope,
    linkUrl: row.link_url,
    onlineScope: row.online_scope,
    onlineUrl: row.online_url,
    onlineModalidad: row.online_modalidad,
    abonoBank: row.abono_bank,
    posTotal: row.pos_total,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export function createLeadProfileRepo(db: DatabaseExecutor) {
  return {
    async findByLeadId(leadId: string): Promise<LeadProfile | undefined> {
      const row = await db
        .selectFrom("workflow_lead_profiles")
        .selectAll()
        .where("lead_id", "=", leadId)
        .executeTakeFirst();

      return row ? toLeadProfile(row) : undefined;
    },

    async upsert(values: LeadProfile): Promise<void> {
      await db
        .insertInto("workflow_lead_profiles")
        .values({
          lead_id: values.leadId,
          proveedor_actual: values.proveedorActual,
          tasa_debito_actual: values.tasaDebitoActual,
          tasa_credito_actual: values.tasaCreditoActual,
          gpv: values.gpv,
          ticket: values.ticket,
          link_scope: values.linkScope,
          link_url: values.linkUrl,
          online_scope: values.onlineScope,
          online_url: values.onlineUrl,
          online_modalidad: values.onlineModalidad,
          abono_bank: values.abonoBank,
          pos_total: values.posTotal,
          updated_at: values.updatedAt,
          updated_by: values.updatedBy,
        } satisfies NewLeadProfileRow)
        .onConflict((oc) =>
          oc.column("lead_id").doUpdateSet({
            proveedor_actual: values.proveedorActual,
            tasa_debito_actual: values.tasaDebitoActual,
            tasa_credito_actual: values.tasaCreditoActual,
            gpv: values.gpv,
            ticket: values.ticket,
            link_scope: values.linkScope,
            link_url: values.linkUrl,
            online_scope: values.onlineScope,
            online_url: values.onlineUrl,
            online_modalidad: values.onlineModalidad,
            abono_bank: values.abonoBank,
            pos_total: values.posTotal,
            updated_at: values.updatedAt,
            updated_by: values.updatedBy,
          }),
        )
        .execute();
    },
  };
}
