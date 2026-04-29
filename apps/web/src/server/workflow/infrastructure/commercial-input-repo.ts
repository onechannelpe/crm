import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { LeadCommercialInput } from "~/server/workflow/application/ports/commercial-input-repository";

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
    giroNegocio: row.giro_negocio,
    tipoProducto: row.tipo_producto,
    urlCliente: row.url_cliente,
    modalidadCobro: row.modalidad_cobro,
    repLegalNombres: row.rep_legal_nombres,
    repLegalApellidoPaterno: row.rep_legal_apellido_paterno,
    repLegalApellidoMaterno: row.rep_legal_apellido_materno,
    repLegalDni: row.rep_legal_dni,
    repLegalTelefono: row.rep_legal_telefono,
    repLegalEmail: row.rep_legal_email,
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
          giro_negocio: values.giroNegocio,
          tipo_producto: values.tipoProducto,
          url_cliente: values.urlCliente,
          modalidad_cobro: values.modalidadCobro,
          rep_legal_nombres: values.repLegalNombres,
          rep_legal_apellido_paterno: values.repLegalApellidoPaterno,
          rep_legal_apellido_materno: values.repLegalApellidoMaterno,
          rep_legal_dni: values.repLegalDni,
          rep_legal_telefono: values.repLegalTelefono,
          rep_legal_email: values.repLegalEmail,
          updated_at: values.updatedAt,
          updated_by: values.updatedBy,
        } satisfies NewCommercialInputRow)
        .onConflict((oc) =>
          oc.column("lead_id").doUpdateSet({
            proveedor_actual: values.proveedorActual,
            tasa_actual: values.tasaActual,
            gpv: values.gpv,
            ticket: values.ticket,
            giro_negocio: values.giroNegocio,
            tipo_producto: values.tipoProducto,
            url_cliente: values.urlCliente,
            modalidad_cobro: values.modalidadCobro,
            rep_legal_nombres: values.repLegalNombres,
            rep_legal_apellido_paterno: values.repLegalApellidoPaterno,
            rep_legal_apellido_materno: values.repLegalApellidoMaterno,
            rep_legal_dni: values.repLegalDni,
            rep_legal_telefono: values.repLegalTelefono,
            rep_legal_email: values.repLegalEmail,
            updated_at: values.updatedAt,
            updated_by: values.updatedBy,
          }),
        )
        .execute();
    },
  };
}
