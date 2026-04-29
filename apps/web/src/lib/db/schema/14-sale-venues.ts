import { sql, type Kysely } from "kysely";

import { ABONO_BANKS } from "~/workflow/contracts/lead-schema";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("workflow_sale_venues")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("sale_id", "text", (col) =>
      col.notNull().references("workflow_sales.id").onDelete("cascade"),
    )
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("nombre_comercial", "varchar(255)", (col) => col.notNull())
    .addColumn("cantidad_pos", "integer", (col) => col.notNull())
    .addColumn("direccion", "text", (col) => col.notNull())
    .addColumn("referencia", "text")
    .addColumn("distrito", "varchar(100)", (col) => col.notNull())
    .addColumn("provincia", "varchar(100)", (col) => col.notNull())
    .addColumn("departamento", "varchar(100)", (col) => col.notNull())
    .addColumn("banco_soles", "varchar(50)", (col) =>
      col
        .notNull()
        .check(sql`banco_soles IN (${sql.join(ABONO_BANKS.map((b) => sql.lit(b)))})`),
    )
    .addColumn("tipo_cuenta_soles", "varchar(20)", (col) =>
      col.notNull().check(sql`tipo_cuenta_soles IN ('AHORROS','CORRIENTE')`),
    )
    .addColumn("nro_cuenta_soles", "varchar(50)", (col) => col.notNull())
    .addColumn("cci_soles", "varchar(50)")
    .addColumn("banco_dolares", "varchar(50)", (col) =>
      col.check(
        sql`banco_dolares IN (${sql.join(ABONO_BANKS.map((b) => sql.lit(b)))}) OR banco_dolares IS NULL`,
      ),
    )
    .addColumn("tipo_cuenta_dolares", "varchar(20)")
    .addColumn("nro_cuenta_dolares", "varchar(50)")
    .addColumn("cci_dolares", "varchar(50)")
    .addColumn("abono", "varchar(50)", (col) =>
      col
        .notNull()
        .check(sql`abono IN (${sql.join(ABONO_BANKS.map((b) => sql.lit(b)))})`),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("created_by", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .execute();

  await db.schema
    .createIndex("idx_workflow_sale_venues_sale")
    .on("workflow_sale_venues")
    .column("sale_id")
    .execute();
  await db.schema
    .createIndex("idx_workflow_sale_venues_lead")
    .on("workflow_sale_venues")
    .column("lead_id")
    .execute();
}
