import type { Kysely } from "kysely";

import { db as globalDb } from "./db";
import { computeHash, readStoredHash, writeStoredHash } from "./migration-hash";
import { SCHEMA_MODULES, SEED_MODULES } from "./schema";

export async function migrateToLatest(db: Kysely<any> = globalDb) {
  const hash = await computeHash(SCHEMA_MODULES, SEED_MODULES);
  const stored = await readStoredHash(db);

  if (stored === hash) return;
  if (stored !== null) {
    throw new Error(
      "Schema changed since DB was built.\n  ⇢ Delete crm.db and rebuild the application",
    );
  }

  for (const module of SCHEMA_MODULES) {
    // eslint-disable-next-line no-await-in-loop
    await module.createTables(db);
  }
  for (const module of SEED_MODULES) {
    // eslint-disable-next-line no-await-in-loop
    await module.run(db);
  }
  await writeStoredHash(db, hash);
}
