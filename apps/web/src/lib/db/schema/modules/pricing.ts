import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("workflow_rate_proposals")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("round", "integer", (col) => col.notNull())
    .addColumn("proposed_debit_rate", "real", (col) => col.notNull())
    .addColumn("proposed_credit_rate", "real", (col) => col.notNull())
    .addColumn("proposed_foreign_rate", "real", (col) => col.notNull())
    .addColumn("fee", "real", (col) => col.notNull())
    .addColumn("payback_pricing", "real", (col) => col.notNull())
    .addColumn("currency", "varchar(3)", (col) => col.notNull())
    .addColumn("proposed_by", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("proposed_at", "integer", (col) => col.notNull())
    .addColumn("outcome", "varchar(20)", (col) => col.notNull())
    .addColumn("decided_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_rate_proposals_lead")
    .on("workflow_rate_proposals")
    .unique()
    .columns(["lead_id", "round"])
    .execute();

  await db.schema
    .createTable("workflow_rate_proposal_policies")
    .addColumn("branch_id", "integer", (col) =>
      col.primaryKey().references("branches.id").onDelete("cascade"),
    )
    .addColumn("validity_days", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .addColumn("updated_by_user_id", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .execute();

  await db.schema
    .createTable("workflow_rate_revisions")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("proposal_id", "text", (col) =>
      col
        .notNull()
        .references("workflow_rate_proposals.id")
        .onDelete("cascade"),
    )
    .addColumn("round", "integer", (col) => col.notNull())
    .addColumn("justification", "text", (col) => col.notNull())
    .addColumn("requested_by", "integer", (col) =>
      col.notNull().references("users.id"),
    )
    .addColumn("requested_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_rate_revisions_lead")
    .on("workflow_rate_revisions")
    .unique()
    .columns(["lead_id", "round"])
    .execute();

  await db.schema
    .createTable("workflow_rate_revision_files")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("lead_id", "text", (col) =>
      col.notNull().references("workflow_leads.id").onDelete("cascade"),
    )
    .addColumn("revision_id", "text", (col) =>
      col
        .notNull()
        .references("workflow_rate_revisions.id")
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
    .createIndex("idx_rate_revision_files_revision")
    .on("workflow_rate_revision_files")
    .columns(["revision_id", "created_at"])
    .execute();
}
