import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("workflow_lead_venues")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("nombre_comercial", "varchar(255)", (col) => col.notNull())
    .addColumn("pos_quantity", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("link_url", "text")
    .addColumn("online_url", "text")
    .addColumn("online_modalidad", "varchar(20)", (col) =>
      col.references("workflow_modalidad_cobro_kinds.value"),
    )
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
    .createIndex("idx_workflow_lead_venues_lead")
    .on("workflow_lead_venues")
    .column("lead_id")
    .execute();

  await db.schema
    .createTable("workflow_currency_kinds")
    .addColumn("value", "varchar(3)", (col) => col.primaryKey())
    .execute();

  await db.schema
    .createTable("workflow_account_type_kinds")
    .addColumn("value", "varchar(20)", (col) => col.primaryKey())
    .execute();

  await db.schema
    .createTable("workflow_abono_banks")
    .addColumn("value", "varchar(50)", (col) => col.primaryKey())
    .execute();

  await db.schema
    .createTable("workflow_lead_venue_accounts")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("venue_id", "text", (col) =>
      col.notNull().references("workflow_lead_venues.id").onDelete("cascade"),
    )
    .addColumn("currency", "varchar(3)", (col) =>
      col.notNull().references("workflow_currency_kinds.value"),
    )
    .addColumn("bank", "varchar(50)", (col) =>
      col.notNull().references("workflow_abono_banks.value"),
    )
    .addColumn("account_type", "varchar(20)", (col) =>
      col.notNull().references("workflow_account_type_kinds.value"),
    )
    .addColumn("account_number", "varchar(50)", (col) => col.notNull())
    .addColumn("cci", "varchar(50)")
    .addColumn("is_settlement", "integer", (col) => col.notNull().defaultTo(0))
    .execute();

  await db.schema
    .createIndex("idx_workflow_lead_venue_accounts_venue")
    .on("workflow_lead_venue_accounts")
    .column("venue_id")
    .execute();
  await db.schema
    .createIndex("idx_workflow_lead_venue_accounts_venue_currency_unique")
    .on("workflow_lead_venue_accounts")
    .columns(["venue_id", "currency"])
    .unique()
    .execute();
  await db.schema
    .createIndex("idx_workflow_lead_venue_accounts_settlement_unique")
    .on("workflow_lead_venue_accounts")
    .columns(["venue_id", "is_settlement"])
    .unique()
    .where("is_settlement", "=", 1)
    .execute();
}
