import { sql } from "kysely";

import type { DatabaseExecutor } from "./db-executor";

// `pg_advisory_xact_lock` is transaction-scoped: Postgres releases it
// automatically on commit or rollback, so a crash mid-transaction can never
// leak a held lock and there is no matching unlock call to forget. `trx` must
// be a transaction (not the bare pool), otherwise the lock would release the
// instant this statement finishes.
//
// `key` is hashed with `hashtext` so callers pass a plain string instead of
// managing Postgres's two-int advisory-lock key space themselves. Callers
// should namespace keys as `${domain}:${subjectId}` so unrelated invariants
// never collide on the same lock.
export async function withAdvisoryLock<T>(
  trx: DatabaseExecutor,
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  await sql`select pg_advisory_xact_lock(hashtext(${key}))`.execute(trx);
  return fn();
}
