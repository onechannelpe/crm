import type { Kysely } from "kysely";

export async function up<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .alterTable("login_flows")
    .addColumn("challenge_id", "integer", (col) =>
      col.references("webauthn_challenges.id").onDelete("cascade"),
    )
    .execute();
}

export async function down<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .alterTable("login_flows")
    .dropColumn("challenge_id")
    .execute();
}
