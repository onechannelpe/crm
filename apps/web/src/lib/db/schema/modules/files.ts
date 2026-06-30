import { sql, type Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("workflow_artifacts")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("artifact_type", "text", (col) => col.notNull())
    .addColumn("direction", "text", (col) => col.notNull())
    .addColumn("execution_mode", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("requested_by_user_id", "uuid", (col) => col.notNull())
    .addColumn("scope_branch_id", "uuid")
    .addColumn("scope_team_id", "uuid")
    .addColumn("policy_snapshot_json", "jsonb", (col) => col.notNull())
    .addColumn("workflow_context_json", "jsonb", (col) => col.notNull())
    .addColumn("error_code", "text")
    .addColumn("error_message", "text")
    .addColumn("expires_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_workflow_artifacts_type_status")
    .on("workflow_artifacts")
    .columns(["artifact_type", "status", "created_at"])
    .execute();

  await db.schema
    .createIndex("idx_workflow_artifacts_user")
    .on("workflow_artifacts")
    .columns(["requested_by_user_id", "created_at"])
    .execute();

  await db.schema
    .createIndex("idx_workflow_artifacts_branch")
    .on("workflow_artifacts")
    .columns(["scope_branch_id", "artifact_type", "status"])
    .execute();

  await db.schema
    .createTable("file_assets")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("storage_key", "text", (col) => col.notNull().unique())
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
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("artifact_file_bindings")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("artifact_id", "text", (col) =>
      col.notNull().references("workflow_artifacts.id").onDelete("cascade"),
    )
    .addColumn("file_asset_id", "uuid", (col) =>
      col.notNull().references("file_assets.id"),
    )
    .addColumn("binding_role", "text", (col) => col.notNull())
    .addColumn("version_no", "integer", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_artifact_file_bindings_artifact")
    .on("artifact_file_bindings")
    .columns(["artifact_id", "version_no"])
    .execute();

  await db.schema
    .createTable("workflow_sale_proof_files")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("artifact_id", "text", (col) =>
      col
        .notNull()
        .unique()
        .references("workflow_artifacts.id")
        .onDelete("cascade"),
    )
    .addColumn("file_asset_id", "uuid", (col) =>
      col.notNull().references("file_assets.id"),
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

  await db.schema
    .createTable("artifact_events")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("artifact_id", "text", (col) =>
      col.notNull().references("workflow_artifacts.id").onDelete("cascade"),
    )
    .addColumn("event_type", "text", (col) => col.notNull())
    .addColumn("actor_user_id", "uuid")
    .addColumn("actor_role", "text")
    .addColumn("request_id", "text")
    .addColumn("trace_id", "text")
    .addColumn("ip_hash", "text")
    .addColumn("user_agent", "text")
    .addColumn("details_json", "jsonb", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_artifact_events_artifact")
    .on("artifact_events")
    .columns(["artifact_id", "created_at"])
    .execute();

  await db.schema
    .createTable("artifact_download_tokens")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`uuidv7()`))
    .addColumn("artifact_id", "text", (col) =>
      col.notNull().references("workflow_artifacts.id").onDelete("cascade"),
    )
    .addColumn("file_asset_id", "uuid", (col) =>
      col.notNull().references("file_assets.id"),
    )
    .addColumn("token_hash", "text", (col) => col.notNull().unique())
    .addColumn("requested_by_user_id", "uuid", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("used_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_artifact_download_tokens_hash")
    .on("artifact_download_tokens")
    .columns(["token_hash", "expires_at"])
    .execute();
}
