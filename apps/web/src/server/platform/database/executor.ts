import type { Kysely, Transaction } from "kysely";

import type { Database } from "~/server/platform/database/types";

export type DatabaseExecutor = Kysely<Database> | Transaction<Database>;

// Kysely types isTransaction as `boolean` on Kysely and `true` on Transaction,
// not as a discriminant, so `if (db.isTransaction)` alone does not narrow.
export function isTransactionExecutor(
  db: DatabaseExecutor,
): db is Transaction<Database> {
  return db.isTransaction;
}
