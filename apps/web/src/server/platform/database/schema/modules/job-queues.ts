import { sql, type Kysely } from "kysely";

import { JOB_TABLE_CHANNELS } from "~/server/platform/jobs/registry";

const WAKE_FUNCTION = "notify_pending_queue_work";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await installQueueWakeTriggers(db);
}

// Queue wakes are derived from durable queue state. Reinstalling them keeps an
// existing disposable development database aligned with the canonical registry.
export async function ensureBaseline<T>(db: Kysely<T>): Promise<void> {
  await installQueueWakeTriggers(db);
}

async function installQueueWakeTriggers<T>(db: Kysely<T>): Promise<void> {
  await sql`
    CREATE OR REPLACE FUNCTION ${sql.id(WAKE_FUNCTION)}()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      has_pending_work boolean;
    BEGIN
      EXECUTE
        'SELECT EXISTS (SELECT 1 FROM queue_rows WHERE queue_state = ''pending'')'
        INTO has_pending_work;

      IF has_pending_work THEN
        PERFORM pg_notify(TG_ARGV[0], '');
      END IF;

      RETURN NULL;
    END;
    $$;
  `.execute(db);

  for (const [table, channel] of Object.entries(JOB_TABLE_CHANNELS)) {
    const insertTrigger = `${table}_wake_on_insert`;
    const updateTrigger = `${table}_wake_on_pending`;

    // PostgreSQL does not support transition tables on a trigger with multiple
    // events, so INSERT and UPDATE have separate statement-level triggers.
    // eslint-disable-next-line no-await-in-loop
    await sql`DROP TRIGGER IF EXISTS ${sql.id(insertTrigger)} ON ${sql.table(table)}`.execute(
      db,
    );
    // eslint-disable-next-line no-await-in-loop
    await sql`DROP TRIGGER IF EXISTS ${sql.id(updateTrigger)} ON ${sql.table(table)}`.execute(
      db,
    );
    // eslint-disable-next-line no-await-in-loop
    await sql`
      CREATE TRIGGER ${sql.id(insertTrigger)}
      AFTER INSERT ON ${sql.table(table)}
      REFERENCING NEW TABLE AS queue_rows
      FOR EACH STATEMENT
      EXECUTE FUNCTION ${sql.id(WAKE_FUNCTION)}(${sql.lit(channel)})
    `.execute(db);
    // eslint-disable-next-line no-await-in-loop
    await sql`
      CREATE TRIGGER ${sql.id(updateTrigger)}
      AFTER UPDATE OF queue_state, claimable_at ON ${sql.table(table)}
      REFERENCING NEW TABLE AS queue_rows
      FOR EACH STATEMENT
      EXECUTE FUNCTION ${sql.id(WAKE_FUNCTION)}(${sql.lit(channel)})
    `.execute(db);
  }
}
