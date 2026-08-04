"use server";

import { sql, type Kysely } from "kysely";

import { JOB_TABLE_CHANNELS } from "~/server/platform/jobs/registry";

const WAKE_FUNCTION = "notify_pending_queue_work";

// Exporting the implementation as `createTables` includes trigger changes in
// the migration hash.
export {
  installQueueWakeTriggers as createTables,
  installQueueWakeTriggers as ensureBaseline,
};

async function installQueueWakeTriggers<T>(db: Kysely<T>): Promise<void> {
  await sql`
    CREATE OR REPLACE FUNCTION ${sql.id(WAKE_FUNCTION)}()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      PERFORM pg_notify(TG_ARGV[0], '');
      RETURN NULL;
    END;
    $$;
  `.execute(db);

  for (const [table, channel] of Object.entries(JOB_TABLE_CHANNELS)) {
    // Notify only when work becomes claimable, not on progress or lease updates.
    // eslint-disable-next-line no-await-in-loop
    await sql`
      CREATE OR REPLACE TRIGGER ${sql.id(`${table}_wake`)}
      AFTER INSERT OR UPDATE OF queue_state ON ${sql.table(table)}
      FOR EACH ROW
      WHEN (NEW.queue_state = 'pending')
      EXECUTE FUNCTION ${sql.id(WAKE_FUNCTION)}(${sql.lit(channel)})
    `.execute(db);
  }
}
