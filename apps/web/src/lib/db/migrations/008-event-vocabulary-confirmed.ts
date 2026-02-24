import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up<T>(db: Kysely<T>): Promise<void> {
  await sql`
    update audit_action_policies
    set action = 'charge_note_confirmed'
    where action = 'charge_note_approved'
  `.execute(db);

  await sql`
    update audit_logs
    set action = 'charge_note_confirmed'
    where action = 'charge_note_approved'
  `.execute(db);

  await sql`
    update app_notifications
    set event_type = 'sale.confirmed'
    where event_type = 'sale.approved'
  `.execute(db);

  await sql`
    update notification_preferences
    set event_type = 'sale.confirmed'
    where event_type = 'sale.approved'
  `.execute(db);
}

export async function down<T>(db: Kysely<T>): Promise<void> {
  await sql`
    update audit_action_policies
    set action = 'charge_note_approved'
    where action = 'charge_note_confirmed'
  `.execute(db);

  await sql`
    update audit_logs
    set action = 'charge_note_approved'
    where action = 'charge_note_confirmed'
  `.execute(db);

  await sql`
    update app_notifications
    set event_type = 'sale.approved'
    where event_type = 'sale.confirmed'
  `.execute(db);

  await sql`
    update notification_preferences
    set event_type = 'sale.approved'
    where event_type = 'sale.confirmed'
  `.execute(db);
}
