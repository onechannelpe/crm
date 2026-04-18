import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { LeadSale } from "~/server/pipeline/application/ports/sale-repository";
import { asLeadId, type LeadId } from "~/server/pipeline/domain/lead-record";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { type UserId } from "~/server/shared/ids";

export type SaleRow = Selectable<Database["pipeline_sales"]>;
export type NewSaleRow = Insertable<Database["pipeline_sales"]>;

function toLeadSale(row: SaleRow): LeadSale {
  return {
    id: row.id,
    leadId: asLeadId(row.lead_id),
    executiveId: row.executive_id,
    proveedorActual: row.proveedor_actual,
    tasaActual: row.tasa_actual,
    gpv: row.gpv,
    ticket: row.ticket,
    abono: row.abono,
    cantidadPos: row.cantidad_pos,
    banco: row.banco,
    nroCuenta: row.nro_cuenta,
    cci: row.cci,
    createdAt: row.created_at,
  };
}

export function createSaleRepo(db: DatabaseExecutor) {
  return {
    async insert(values: Omit<LeadSale, "id">): Promise<number> {
      const result = await db
        .insertInto("pipeline_sales")
        .values({
          lead_id: values.leadId,
          executive_id: values.executiveId,
          proveedor_actual: values.proveedorActual,
          tasa_actual: values.tasaActual,
          gpv: values.gpv,
          ticket: values.ticket,
          abono: values.abono,
          cantidad_pos: values.cantidadPos,
          banco: values.banco,
          nro_cuenta: values.nroCuenta,
          cci: values.cci,
          created_at: values.createdAt,
        } satisfies NewSaleRow)
        .executeTakeFirstOrThrow();

      return Number(result.insertId);
    },

    async findById(id: number): Promise<LeadSale | undefined> {
      const row = await db
        .selectFrom("pipeline_sales")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      return row ? toLeadSale(row) : undefined;
    },

    async findByLeadId(leadId: LeadId): Promise<LeadSale | undefined> {
      const row = await db
        .selectFrom("pipeline_sales")
        .selectAll()
        .where("lead_id", "=", leadId)
        .orderBy("created_at", "desc")
        .executeTakeFirst();

      return row ? toLeadSale(row) : undefined;
    },

    async list(limit: number, offset: number): Promise<LeadSale[]> {
      const rows = await db
        .selectFrom("pipeline_sales")
        .selectAll()
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset)
        .execute();

      return rows.map(toLeadSale);
    },

    async listByExecutive(
      executiveId: UserId,
      limit: number,
      offset: number,
    ): Promise<LeadSale[]> {
      const rows = await db
        .selectFrom("pipeline_sales")
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
