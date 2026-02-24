import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up<T>(db: Kysely<T>): Promise<void> {
  await sql`
    update charge_notes
    set status = 'pending_confirmation'
    where status = 'pending_confirmation'
  `.execute(db);

  await sql`
    update charge_notes
    set status = 'confirmed'
    where status = 'approved'
  `.execute(db);
}

export async function down<T>(db: Kysely<T>): Promise<void> {
  await sql`
    update charge_notes
    set status = 'pending_confirmation'
    where status = 'pending_confirmation'
  `.execute(db);

  await sql`
    update charge_notes
    set status = 'approved'
    where status = 'confirmed'
  `.execute(db);
}
