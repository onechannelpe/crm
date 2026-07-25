import { sql } from "kysely";

import type { DatabaseExecutor } from "./executor";

// Postgres releases pg_advisory_xact_lock at transaction end. Pass a transaction,
// not the pool, or the lock ends when this query finishes.
// Hash the key so callers need not manage Postgres's advisory-lock integer pairs.
export async function withAdvisoryLock<T>(
  trx: DatabaseExecutor,
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  await sql`select pg_advisory_xact_lock(hashtext(${key}))`.execute(trx);
  return fn();
}
