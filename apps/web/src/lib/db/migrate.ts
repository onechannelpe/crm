import type { MigrationProvider } from "kysely";
import { Migrator } from "kysely";

import { db } from "./db";
import * as m001 from "./migrations/001-initial";
import * as m002 from "./migrations/002-client-search-views";
import * as m003 from "./migrations/003-user-invites";
import * as m004 from "./migrations/004-action-observability";

/**
 * Static migration provider that avoids FileMigrationProvider's dynamic import(),
 * which fails on Windows under Vite SSR due to bare drive-letter paths (f:\...)
 * not being valid file:// URLs for Node's ESM loader.
 */
const staticProvider: MigrationProvider = {
  async getMigrations() {
    return {
      "001-initial": m001,
      "002-client-search-views": m002,
      "003-user-invites": m003,
      "004-action-observability": m004,
    };
  },
};

export async function migrateToLatest() {
  const migrator = new Migrator({
    db,
    provider: staticProvider,
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === "Success") {
      console.log(`migration "${it.migrationName}" executed successfully`);
    } else if (it.status === "Error") {
      console.error(`migration "${it.migrationName}" failed`);
    }
  });

  if (error) {
    console.error("migration failed:", error);
    throw error;
  }
}
