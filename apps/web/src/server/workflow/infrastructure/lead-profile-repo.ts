import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  CommercialProfileFields,
  DigitalPolicyFields,
  LeadProfile,
  LeadProfileRepository,
} from "~/server/workflow/application/ports/entities";

type LeadProfileRow = Selectable<Database["workflow_lead_profiles"]>;
type NewLeadProfileRow = Insertable<Database["workflow_lead_profiles"]>;

function toCommercialColumns(fields: CommercialProfileFields) {
  return {
    proveedor_actual: fields.proveedorActual,
    tasa_debito_actual: fields.tasaDebitoActual,
    tasa_credito_actual: fields.tasaCreditoActual,
    gpv: fields.gpv,
    ticket: fields.ticket,
    abono_bank: fields.abonoBank,
    pos_total: fields.posTotal,
  };
}

function toDigitalColumns(fields: DigitalPolicyFields) {
  return {
    link_scope: fields.linkScope,
    link_url: fields.linkUrl,
    online_scope: fields.onlineScope,
    online_url: fields.onlineUrl,
    online_modalidad: fields.onlineModalidad,
  };
}

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

export function createLeadProfileRepo(
  db: DatabaseExecutor,
): LeadProfileRepository {
  return {
    async findByLeadId(leadId: string): Promise<LeadProfile | undefined> {
      const row = await db
        .selectFrom("workflow_lead_profiles")
        .selectAll()
        .where("lead_id", "=", leadId)
        .executeTakeFirst();

      return row ? toLeadProfile(row) : undefined;
    },

    async createCommercialProfile({
      leadId,
      fields,
      updatedAt,
      updatedBy,
    }): Promise<void> {
      await db
        .insertInto("workflow_lead_profiles")
        .values({
          lead_id: leadId,
          ...toCommercialColumns(fields),
          link_scope: "none",
          link_url: null,
          online_scope: "none",
          online_url: null,
          online_modalidad: null,
          updated_at: updatedAt,
          updated_by: updatedBy,
        } satisfies NewLeadProfileRow)
        .execute();
    },

    async updateCommercialScope({
      leadId,
      fields,
      updatedAt,
      updatedBy,
    }): Promise<void> {
      await db
        .updateTable("workflow_lead_profiles")
        .set({
          ...toCommercialColumns(fields),
          updated_at: updatedAt,
          updated_by: updatedBy,
        })
        .where("lead_id", "=", leadId)
        .execute();
    },

    async updateDigitalPolicy({
      leadId,
      fields,
      updatedAt,
      updatedBy,
    }): Promise<void> {
      await db
        .updateTable("workflow_lead_profiles")
        .set({
          ...toDigitalColumns(fields),
          updated_at: updatedAt,
          updated_by: updatedBy,
        })
        .where("lead_id", "=", leadId)
        .execute();
    },
  };
}
