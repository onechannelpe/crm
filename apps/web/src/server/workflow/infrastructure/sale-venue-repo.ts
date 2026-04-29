import { randomUUIDv7 } from "bun";
import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { LeadSaleVenue } from "~/server/workflow/application/ports/sale-repository";

export type SaleVenueRow = Selectable<Database["workflow_sale_venues"]>;
export type NewSaleVenueRow = Insertable<Database["workflow_sale_venues"]>;

function toLeadSaleVenue(row: SaleVenueRow): LeadSaleVenue {
  return {
    id: row.id,
    saleId: row.sale_id,
    leadId: row.lead_id,
    nombreComercial: row.nombre_comercial,
    cantidadPos: row.cantidad_pos,
    direccion: row.direccion,
    referencia: row.referencia,
    distrito: row.distrito,
    provincia: row.provincia,
    departamento: row.departamento,
    bancoSoles: row.banco_soles,
    tipoCuentaSoles: row.tipo_cuenta_soles,
    nroCuentaSoles: row.nro_cuenta_soles,
    cciSoles: row.cci_soles,
    bancoDolares: row.banco_dolares,
    tipoCuentaDolares: row.tipo_cuenta_dolares,
    nroCuentaDolares: row.nro_cuenta_dolares,
    cciDolares: row.cci_dolares,
    abono: row.abono,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export function createSaleVenueRepo(db: DatabaseExecutor) {
  return {
    async insert(values: Omit<LeadSaleVenue, "id">): Promise<string> {
      const id = randomUUIDv7();
      await db
        .insertInto("workflow_sale_venues")
        .values({
          id,
          sale_id: values.saleId,
          lead_id: values.leadId,
          nombre_comercial: values.nombreComercial,
          cantidad_pos: values.cantidadPos,
          direccion: values.direccion,
          referencia: values.referencia,
          distrito: values.distrito,
          provincia: values.provincia,
          departamento: values.departamento,
          banco_soles: values.bancoSoles,
          tipo_cuenta_soles: values.tipoCuentaSoles,
          nro_cuenta_soles: values.nroCuentaSoles,
          cci_soles: values.cciSoles,
          banco_dolares: values.bancoDolares,
          tipo_cuenta_dolares: values.tipoCuentaDolares,
          nro_cuenta_dolares: values.nroCuentaDolares,
          cci_dolares: values.cciDolares,
          abono: values.abono,
          created_at: values.createdAt,
          created_by: values.createdBy,
        } satisfies NewSaleVenueRow)
        .executeTakeFirstOrThrow();

      return id;
    },

    async findById(id: string): Promise<LeadSaleVenue | undefined> {
      const row = await db
        .selectFrom("workflow_sale_venues")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      return row ? toLeadSaleVenue(row) : undefined;
    },

    async listBySaleId(saleId: string): Promise<LeadSaleVenue[]> {
      const rows = await db
        .selectFrom("workflow_sale_venues")
        .selectAll()
        .where("sale_id", "=", saleId)
        .orderBy("created_at", "asc")
        .execute();

      return rows.map(toLeadSaleVenue);
    },

    async listByLeadId(leadId: string): Promise<LeadSaleVenue[]> {
      const rows = await db
        .selectFrom("workflow_sale_venues")
        .selectAll()
        .where("lead_id", "=", leadId)
        .orderBy("created_at", "asc")
        .execute();

      return rows.map(toLeadSaleVenue);
    },
  };
}
