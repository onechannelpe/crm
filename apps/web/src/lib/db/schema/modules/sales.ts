import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("workflow_lead_venues")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("trade_name", "text", (col) => col.notNull())
    .addColumn("pos_quantity", "integer", (col) => col.notNull())
    .addColumn("link_url", "text")
    .addColumn("online_url", "text")
    .addColumn("online_collection_mode", "text", (col) =>
      col.references("workflow_collection_mode_kinds.value"),
    )
    .addColumn("address", "text", (col) => col.notNull())
    .addColumn("address_reference", "text", (col) => col.notNull())
    .addColumn("district", "text", (col) => col.notNull())
    .addColumn("province", "text", (col) => col.notNull())
    .addColumn("department", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("created_by", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .execute();

  await db.schema
    .createIndex("idx_workflow_lead_venues_lead")
    .on("workflow_lead_venues")
    .column("lead_id")
    .execute();

  await db.schema
    .createTable("workflow_lead_venue_accounts")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("venue_id", "text", (col) =>
      col.notNull().references("workflow_lead_venues.id").onDelete("cascade"),
    )
    .addColumn("currency", "text", (col) =>
      col.notNull().references("workflow_currency_kinds.value"),
    )
    .addColumn("bank", "text", (col) =>
      col.notNull().references("workflow_settlement_banks.value"),
    )
    .addColumn("account_type", "text", (col) =>
      col.notNull().references("workflow_account_type_kinds.value"),
    )
    .addColumn("account_number", "text", (col) => col.notNull())
    .addColumn("cci", "text")
    .addColumn("is_settlement", "boolean", (col) =>
      col.notNull().defaultTo(false),
    )
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
    .where("is_settlement", "=", true)
    .execute();
}
