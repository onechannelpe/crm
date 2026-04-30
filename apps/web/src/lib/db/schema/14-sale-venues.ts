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
    .addColumn("referencia", "text", (col) => col.notNull())
    .addColumn("distrito", "varchar(100)", (col) => col.notNull())
    .addColumn("provincia", "varchar(100)", (col) => col.notNull())
    .addColumn("departamento", "varchar(100)", (col) => col.notNull())
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

  await db.schema
    .createTable("workflow_sale_venue_accounts")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("venue_id", "text", (col) =>
      col.notNull().references("workflow_sale_venues.id").onDelete("cascade"),
    )
    .addColumn("currency", "varchar(3)", (col) =>
      col.notNull().check(sql`currency IN ('PEN','USD')`),
    )
    .addColumn("bank", "varchar(50)", (col) =>
      col
        .notNull()
        .check(sql`bank IN (${sql.join(ABONO_BANKS.map((b) => sql.lit(b)))})`),
    )
    .addColumn("account_type", "varchar(20)", (col) =>
      col.notNull().check(sql`account_type IN ('AHORROS','CORRIENTE')`),
    )
    .addColumn("account_number", "varchar(50)", (col) => col.notNull())
    .addColumn("cci", "varchar(50)")
    .addColumn("is_settlement", "integer", (col) =>
      col
        .notNull()
        .defaultTo(0)
        .check(sql`is_settlement IN (0,1)`),
    )
    .execute();

  await db.schema
    .createIndex("idx_workflow_sale_venue_accounts_venue")
    .on("workflow_sale_venue_accounts")
    .column("venue_id")
    .execute();
  await db.schema
    .createIndex("idx_workflow_sale_venue_accounts_venue_currency_unique")
    .on("workflow_sale_venue_accounts")
    .columns(["venue_id", "currency"])
    .unique()
    .execute();
  await db.schema
    .createIndex("idx_workflow_sale_venue_accounts_settlement_unique")
    .on("workflow_sale_venue_accounts")
    .columns(["venue_id", "is_settlement"])
    .unique()
    .where("is_settlement", "=", 1)
    .execute();
}
