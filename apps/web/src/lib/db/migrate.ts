import type { MigrationProvider } from "kysely";
import { Migrator } from "kysely";

import { createLogger } from "~/lib/observability/logger";

import { db } from "./db";
import {
  checkIntegrityHash,
  computeMigrationsHash,
  writeIntegrityHash,
} from "./migration-hash";
import * as m001 from "./migrations/001-initial";
import * as m002 from "./migrations/002-client-search-views";
import * as m003 from "./migrations/003-user-invites";
import * as m004 from "./migrations/004-action-observability";
import * as m005 from "./migrations/005-report-export-observability";
import * as m006 from "./migrations/006-sales-records-core";
import * as m007 from "./migrations/007-action-rate-limit";
import * as m008 from "./migrations/008-search-enrichment";
import * as m009 from "./migrations/009-extension-runtime";
import * as m010 from "./migrations/010-google-oauth";
import * as m011 from "./migrations/011-login-flows";

const logger = createLogger("db-migrate");

/**
 * Uses static imports instead of Kysely's FileMigrationProvider.
 * FileMigrationProvider passes raw filesystem paths (e.g. C:\...) to dynamic
 * import(), which Node's ESM loader rejects — it requires file:// URLs.
 */
const migrations = {
  "001-initial": m001,
  "002-client-search-views": m002,
  "003-user-invites": m003,
  "004-action-observability": m004,
  "005-report-export-observability": m005,
  "006-sales-records-core": m006,
  "007-action-rate-limit": m007,
  "008-search-enrichment": m008,
  "009-extension-runtime": m009,
  "010-google-oauth": m010,
  "011-login-flows": m011,
};

const staticProvider: MigrationProvider = {
  async getMigrations() {
    return migrations;
  },
};

export async function migrateToLatest() {
  const currentHash = await computeMigrationsHash(migrations);
  await checkIntegrityHash(db, currentHash);

  const migrator = new Migrator({
    db,
    provider: staticProvider,
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === "Success") {
      logger.info("migration_executed", { migrationName: it.migrationName });
    } else if (it.status === "Error") {
      logger.error("migration_failed", { migrationName: it.migrationName });
    }
  });

  if (error) {
    logger.error("migrate_to_latest_failed", { error });
    throw error;
  }

  await writeIntegrityHash(db, currentHash);
}
