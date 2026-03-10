import type { Kysely } from "kysely";

import { createLogger } from "~/lib/observability/logger";

import { db as globalDb } from "./db";
import {
  checkIntegrityHash,
  computeMigrationsHash,
  writeIntegrityHash,
} from "./migration-hash";
import * as s00 from "./schema/00-core";
import * as s01 from "./schema/01-users-auth";
import * as s02 from "./schema/02-crm";
import * as s03 from "./schema/03-notifications";
import * as s04 from "./schema/04-products-sales";
import * as s05 from "./schema/05-observability";
import * as s06 from "./schema/06-extensions";
import * as s07 from "./schema/07-features";
import * as seed00 from "./seeds/00-audit-policies";

const logger = createLogger("db-schema");

const schemas = {
  "00-core": s00,
  "01-users-auth": s01,
  "02-crm": s02,
  "03-notifications": s03,
  "04-products-sales": s04,
  "05-observability": s05,
  "06-extensions": s06,
  "07-features": s07,
};

const seeds = {
  "00-audit-policies": seed00,
};

export async function migrateToLatest(db: Kysely<any> = globalDb) {
  // We still use the hash to allow dev wipe-and-rebuild workflows.
  // The hash input is now the declarative schema, but the developer experience remains the same.
  const currentHash = await computeMigrationsHash({ ...schemas, ...seeds });
  
  const isMatch = await checkIntegrityHash(db, currentHash);
  if (isMatch) {
    return;
  }

  try {
    // 1. Execute schema definitions
    for (const [name, module] of Object.entries(schemas)) {
      await module.createTables(db);
      logger.info("schema_applied", { schemaName: name });
    }

    // 2. Execute seeds
    for (const [name, module] of Object.entries(seeds)) {
      await module.run(db);
      logger.info("seed_applied", { seedName: name });
    }
  } catch (error) {
    logger.error("schema_apply_failed", { error });
    throw error;
  }

  await writeIntegrityHash(db, currentHash);
}
