import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable("branches")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("name", "varchar(255)", (col) => col.notNull())
        .addColumn("created_at", "integer", (col) => col.notNull())
        .execute();

    await db.schema
        .createTable("users")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("branch_id", "integer", (col) => col.notNull().references("branches.id"))
        .addColumn("team_id", "integer", (col) => col.references("teams.id"))
        .addColumn("email", "varchar(255)", (col) => col.notNull().unique())
        .addColumn("password_hash", "varchar(255)", (col) => col.notNull())
        .addColumn("full_name", "varchar(255)", (col) => col.notNull())
        .addColumn("role", "varchar(50)", (col) => col.notNull())
        .addColumn("is_active", "integer", (col) => col.notNull().defaultTo(1))
        .addColumn("created_at", "integer", (col) => col.notNull())
        .execute();

    await db.schema
        .createTable("teams")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("branch_id", "integer", (col) => col.notNull().references("branches.id"))
        .addColumn("name", "varchar(255)", (col) => col.notNull())
        .addColumn("supervisor_id", "integer", (col) => col.references("users.id"))
        .addColumn("created_at", "integer", (col) => col.notNull())
        .execute();

    await db.schema
        .createTable("organizations")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("ruc", "varchar(20)", (col) => col.notNull().unique())
        .addColumn("name", "varchar(255)", (col) => col.notNull())
        .addColumn("locked_branch_id", "integer", (col) => col.references("branches.id"))
        .addColumn("locked_at", "integer")
        .addColumn("locked_by_user_id", "integer", (col) => col.references("users.id"))
        .addColumn("created_at", "integer", (col) => col.notNull())
        .execute();

    await db.schema
        .createTable("contacts")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("organization_id", "integer", (col) => col.notNull().references("organizations.id"))
        .addColumn("dni", "varchar(20)", (col) => col.notNull())
        .addColumn("name", "varchar(255)", (col) => col.notNull())
        .addColumn("phone_primary", "varchar(20)")
        .addColumn("phone_secondary", "varchar(20)")
        .addColumn("last_contacted_at", "integer")
        .addColumn("last_contacted_by_user_id", "integer", (col) => col.references("users.id"))
        .addColumn("cooldown_until", "integer")
        .addColumn("created_at", "integer", (col) => col.notNull())
        .execute();

    await db.schema
        .createTable("lead_assignments")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("user_id", "integer", (col) => col.notNull().references("users.id"))
        .addColumn("contact_id", "integer", (col) => col.notNull().references("contacts.id"))
        .addColumn("assigned_at", "integer", (col) => col.notNull())
        .addColumn("expires_at", "integer", (col) => col.notNull())
        .addColumn("status", "varchar(20)", (col) => col.notNull())
        .execute();

    await db.schema
        .createTable("quota_allocations")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("user_id", "integer", (col) => col.notNull().references("users.id"))
        .addColumn("allocated_by_user_id", "integer", (col) => col.notNull().references("users.id"))
        .addColumn("date", "varchar(10)", (col) => col.notNull())
        .addColumn("quota_amount", "integer", (col) => col.notNull())
        .addColumn("used_amount", "integer", (col) => col.notNull().defaultTo(0))
        .addColumn("created_at", "integer", (col) => col.notNull())
        .execute();

    await db.schema
        .createTable("products")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("name", "varchar(255)", (col) => col.notNull())
        .addColumn("category", "varchar(50)", (col) => col.notNull())
        .addColumn("subtype", "varchar(50)")
        .addColumn("price", "real", (col) => col.notNull())
        .addColumn("is_active", "integer", (col) => col.notNull().defaultTo(1))
        .execute();

    await db.schema
        .createTable("charge_notes")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("contact_id", "integer", (col) => col.notNull().references("contacts.id"))
        .addColumn("user_id", "integer", (col) => col.notNull().references("users.id"))
        .addColumn("status", "varchar(50)", (col) => col.notNull())
        .addColumn("exec_code_real", "varchar(255)")
        .addColumn("exec_code_tdp", "varchar(255)")
        .addColumn("created_at", "integer", (col) => col.notNull())
        .addColumn("updated_at", "integer", (col) => col.notNull())
        .execute();

    await db.schema
        .createTable("charge_note_items")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("charge_note_id", "integer", (col) => col.notNull().references("charge_notes.id"))
        .addColumn("product_id", "integer", (col) => col.notNull().references("products.id"))
        .addColumn("quantity", "integer", (col) => col.notNull())
        .execute();

    await db.schema
        .createTable("rejection_logs")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("charge_note_id", "integer", (col) => col.notNull().references("charge_notes.id"))
        .addColumn("reviewer_id", "integer", (col) => col.notNull().references("users.id"))
        .addColumn("field_id", "varchar(255)", (col) => col.notNull())
        .addColumn("reviewer_note", "text")
        .addColumn("is_resolved", "integer", (col) => col.notNull().defaultTo(0))
        .addColumn("created_at", "integer", (col) => col.notNull())
        .execute();

    await db.schema
        .createTable("interaction_logs")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("contact_id", "integer", (col) => col.notNull().references("contacts.id"))
        .addColumn("user_id", "integer", (col) => col.notNull().references("users.id"))
        .addColumn("outcome", "varchar(255)", (col) => col.notNull())
        .addColumn("notes", "text")
        .addColumn("duration_seconds", "integer")
        .addColumn("created_at", "integer", (col) => col.notNull())
        .execute();

    await db.schema
        .createTable("inventory_items")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("product_id", "integer", (col) => col.notNull().references("products.id"))
        .addColumn("serial_number", "varchar(255)", (col) => col.notNull().unique())
        .addColumn("status", "varchar(20)", (col) => col.notNull())
        .addColumn("created_at", "integer", (col) => col.notNull())
        .execute();

    await db.schema
        .createTable("inventory_locks")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("inventory_item_id", "integer", (col) => col.notNull().references("inventory_items.id"))
        .addColumn("charge_note_id", "integer", (col) => col.notNull().references("charge_notes.id"))
        .addColumn("locked_at", "integer", (col) => col.notNull())
        .addColumn("expires_at", "integer", (col) => col.notNull())
        .execute();

    await db.schema
        .createTable("document_attachments")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("charge_note_id", "integer", (col) => col.notNull().references("charge_notes.id"))
        .addColumn("filename", "varchar(255)", (col) => col.notNull())
        .addColumn("filepath", "varchar(500)", (col) => col.notNull())
        .addColumn("mimetype", "varchar(100)", (col) => col.notNull())
        .addColumn("size", "integer", (col) => col.notNull())
        .addColumn("version", "integer", (col) => col.notNull().defaultTo(1))
        .addColumn("created_at", "integer", (col) => col.notNull())
        .execute();

    await db.schema
        .createTable("agent_status_logs")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("user_id", "integer", (col) => col.notNull().references("users.id"))
        .addColumn("status", "varchar(20)", (col) => col.notNull())
        .addColumn("latitude", "real", (col) => col.notNull())
        .addColumn("longitude", "real", (col) => col.notNull())
        .addColumn("comment", "text")
        .addColumn("started_at", "integer", (col) => col.notNull())
        .addColumn("ended_at", "integer")
        .execute();

    await db.schema
        .createTable("audit_logs")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("user_id", "integer", (col) => col.notNull().references("users.id"))
        .addColumn("action", "varchar(255)", (col) => col.notNull())
        .addColumn("entity_type", "varchar(100)", (col) => col.notNull())
        .addColumn("entity_id", "integer", (col) => col.notNull())
        .addColumn("changes", "text")
        .addColumn("created_at", "integer", (col) => col.notNull())
        .execute();

    await db.schema
        .createTable("passkeys")
        .addColumn("id", "varchar(512)", (col) => col.primaryKey())
        .addColumn("user_id", "integer", (col) => col.notNull().references("users.id"))
        .addColumn("public_key", "text", (col) => col.notNull())
        .addColumn("counter", "integer", (col) => col.notNull())
        .addColumn("transports", "text")
        .addColumn("created_at", "integer", (col) => col.notNull())
        .addColumn("last_used_at", "integer")
        .execute();

    await db.schema
        .createTable("webauthn_challenges")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("user_id", "integer", (col) => col.references("users.id"))
        .addColumn("type", "varchar(32)", (col) => col.notNull())
        .addColumn("challenge", "varchar(512)", (col) => col.notNull())
        .addColumn("expires_at", "integer", (col) => col.notNull())
        .addColumn("created_at", "integer", (col) => col.notNull())
        .execute();

    await db.schema
        .createTable("user_sessions")
        .addColumn("id", "text", (col) => col.primaryKey())
        .addColumn("user_id", "integer", (col) => col.notNull().references("users.id").onDelete("cascade"))
        .addColumn("branch_id", "integer", (col) => col.notNull().references("branches.id"))
        .addColumn("role", "text", (col) => col.notNull())
        .addColumn("ip_address", "text")
        .addColumn("user_agent", "text")
        .addColumn("created_at", "integer", (col) => col.notNull())
        .addColumn("last_activity", "integer", (col) => col.notNull())
        .addColumn("expires_at", "integer", (col) => col.notNull())
        .execute();

    await db.schema.createIndex("idx_users_email").on("users").column("email").execute();
    await db.schema.createIndex("idx_organizations_ruc").on("organizations").column("ruc").execute();
    await db.schema.createIndex("idx_contacts_dni").on("contacts").column("dni").execute();
    await db.schema.createIndex("idx_lead_assignments_user").on("lead_assignments").columns(["user_id", "status"]).execute();
    await db.schema.createIndex("idx_quota_user_date").on("quota_allocations").columns(["user_id", "date"]).execute();
    await db.schema.createIndex("idx_charge_notes_user").on("charge_notes").columns(["user_id", "status"]).execute();
    await db.schema.createIndex("idx_audit_entity").on("audit_logs").columns(["entity_type", "entity_id"]).execute();
    await db.schema.createIndex("idx_user_sessions_user_id").on("user_sessions").column("user_id").execute();
    await db.schema.createIndex("idx_user_sessions_expires_at").on("user_sessions").column("expires_at").execute();
}
