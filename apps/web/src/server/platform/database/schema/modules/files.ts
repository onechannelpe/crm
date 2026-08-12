import { sql, type Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("file_assets")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("storage_key", "text", (col) => col.notNull().unique())
    .addColumn("purpose", "text", (col) => col.notNull())
    .addColumn("original_filename", "text", (col) => col.notNull())
    .addColumn("safe_display_filename", "text", (col) => col.notNull())
    .addColumn("detected_mime", "text", (col) => col.notNull())
    .addColumn("extension", "text", (col) => col.notNull())
    .addColumn("size_bytes", "integer", (col) => col.notNull())
    .addColumn("sha256_hex", "text", (col) => col.notNull())
    .addColumn("signature_kind", "text")
    .addColumn("scan_status", "text", (col) => col.notNull())
    .addColumn("scan_engine", "text")
    .addColumn("scan_reference", "text")
    .addColumn("created_by_user_id", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_file_assets_purpose_created")
    .on("file_assets")
    .columns(["purpose", "created_at"])
    .execute();

  await db.schema
    .createTable("file_download_tokens")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("file_asset_id", "uuid", (col) =>
      col.notNull().references("file_assets.id").onDelete("cascade"),
    )
    .addColumn("token_hash", "text", (col) => col.notNull().unique())
    .addColumn("requested_by_user_id", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("used_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_file_download_tokens_hash")
    .on("file_download_tokens")
    .columns(["token_hash", "expires_at"])
    .execute();

  await db.schema
    .createTable("workflow_sale_proof_files")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("file_asset_id", "uuid", (col) =>
      col.notNull().unique().references("file_assets.id").onDelete("cascade"),
    )
    .addColumn("uploaded_by_user_id", "uuid", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_sale_proof_files_lead")
    .on("workflow_sale_proof_files")
    .columns(["lead_id", "created_at"])
    .execute();
}
