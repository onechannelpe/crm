import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("workflow_artifacts")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("artifact_type", "varchar(60)", (col) => col.notNull())
    .addColumn("direction", "varchar(20)", (col) => col.notNull())
    .addColumn("execution_mode", "varchar(10)", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("requested_by_user_id", "integer", (col) => col.notNull())
    .addColumn("scope_branch_id", "integer")
    .addColumn("scope_team_id", "integer")
    .addColumn("policy_snapshot_json", "text", (col) => col.notNull())
    .addColumn("workflow_context_json", "text", (col) => col.notNull())
    .addColumn("error_code", "varchar(60)")
    .addColumn("error_message", "text")
    .addColumn("expires_at", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
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
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("storage_key", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("original_filename", "varchar(255)", (col) => col.notNull())
    .addColumn("safe_display_filename", "varchar(255)", (col) => col.notNull())
    .addColumn("detected_mime", "varchar(120)", (col) => col.notNull())
    .addColumn("extension", "varchar(20)", (col) => col.notNull())
    .addColumn("size_bytes", "integer", (col) => col.notNull())
    .addColumn("sha256_hex", "varchar(64)", (col) => col.notNull())
    .addColumn("signature_kind", "varchar(40)")
    .addColumn("scan_status", "varchar(20)", (col) => col.notNull())
    .addColumn("scan_engine", "varchar(60)")
    .addColumn("scan_reference", "varchar(255)")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("artifact_file_bindings")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("artifact_id", "text", (col) =>
      col.notNull().references("workflow_artifacts.id").onDelete("cascade"),
    )
    .addColumn("file_asset_id", "integer", (col) =>
      col.notNull().references("file_assets.id"),
    )
    .addColumn("binding_role", "varchar(30)", (col) => col.notNull())
    .addColumn("version_no", "integer", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_artifact_file_bindings_artifact")
    .on("artifact_file_bindings")
    .columns(["artifact_id", "version_no"])
    .execute();

  await db.schema
    .createTable("workflow_sale_proof_files")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
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
    .addColumn("file_asset_id", "integer", (col) =>
      col.notNull().references("file_assets.id"),
    )
    .addColumn("uploaded_by_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_sale_proof_files_lead")
    .on("workflow_sale_proof_files")
    .columns(["lead_id", "created_at"])
    .execute();

  await db.schema
    .createTable("artifact_events")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("artifact_id", "text", (col) =>
      col.notNull().references("workflow_artifacts.id").onDelete("cascade"),
    )
    .addColumn("event_type", "varchar(80)", (col) => col.notNull())
    .addColumn("actor_user_id", "integer")
    .addColumn("actor_role", "varchar(30)")
    .addColumn("request_id", "varchar(100)")
    .addColumn("trace_id", "varchar(100)")
    .addColumn("ip_hash", "varchar(64)")
    .addColumn("user_agent", "varchar(500)")
    .addColumn("details_json", "text", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_artifact_events_artifact")
    .on("artifact_events")
    .columns(["artifact_id", "created_at"])
    .execute();

  await db.schema
    .createTable("artifact_download_tokens")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("artifact_id", "text", (col) =>
      col.notNull().references("workflow_artifacts.id").onDelete("cascade"),
    )
    .addColumn("file_asset_id", "integer", (col) =>
      col.notNull().references("file_assets.id"),
    )
    .addColumn("token_hash", "varchar(64)", (col) => col.notNull().unique())
    .addColumn("requested_by_user_id", "integer", (col) => col.notNull())
    .addColumn("expires_at", "integer", (col) => col.notNull())
    .addColumn("used_at", "integer")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_artifact_download_tokens_hash")
    .on("artifact_download_tokens")
    .columns(["token_hash", "expires_at"])
    .execute();
}
