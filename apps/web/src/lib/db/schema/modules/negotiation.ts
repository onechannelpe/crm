import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("workflow_negotiation_requests")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("round", "integer", (col) => col.notNull())
    .addColumn("justification", "text", (col) => col.notNull())
    .addColumn("requested_by", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("requested_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_negotiation_requests_lead")
    .on("workflow_negotiation_requests")
    .unique()
    .columns(["lead_id", "round"])
    .execute();

  await db.schema
    .createTable("workflow_negotiation_files")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("negotiation_request_id", "text", (col) =>
      col
        .notNull()
        .references("workflow_negotiation_requests.id")
        .onDelete("cascade"),
    )
    .addColumn("artifact_id", "text", (col) =>
      col
        .notNull()
        .unique()
        .references("workflow_artifacts.id")
        .onDelete("cascade"),
    )
    .addColumn("file_asset_id", "integer", (col) =>
      col.notNull().references("file_assets.id"),
    )
    .addColumn("uploaded_by_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_negotiation_files_request")
    .on("workflow_negotiation_files")
    .columns(["negotiation_request_id", "created_at"])
    .execute();
}
