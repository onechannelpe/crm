import { createClient } from "@libsql/client";
import { Kysely } from "kysely";
import { LibSQLDialect } from "kysely-turso/libsql";

import { createLogger } from "~/lib/observability/logger";

import type { Database as DatabaseSchema } from "./types";

const logger = createLogger("db-client");

export function createDb(dbPath: string): Kysely<DatabaseSchema> {
  logger.info("db_initialization_started", { path: dbPath });

  const client = createClient({
    url: `file:${dbPath}`,
    intMode: "number",
  });

  const applyPragma = (statement: string) => {
    void (async () => {
      try {
        await client.execute(statement);
      } catch (error: unknown) {
        logger.error("pragma_apply_failed", { statement, error });
      }
    })();
  };

  applyPragma("PRAGMA journal_mode = WAL");
  applyPragma("PRAGMA synchronous = NORMAL");
  applyPragma("PRAGMA busy_timeout = 5000");
  applyPragma("PRAGMA foreign_keys = ON");
  applyPragma("PRAGMA cache_size = -32000");

  return new Kysely<DatabaseSchema>({
    dialect: new LibSQLDialect({ client }),
  });
}
