import { createClient } from "@libsql/client";
import { Kysely } from "kysely";
import { LibSQLDialect } from "kysely-turso/libsql";

import { createLogger } from "~/lib/observability/logger";

import type { Database as DatabaseSchema } from "./types";

const logger = createLogger("db-client");

export function createDb(dbUrl: string): Kysely<DatabaseSchema> {
  logger.info("db_initialization_started", { url: dbUrl });

  const client = createClient({
    url: dbUrl,
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

  const isLocalSqlite =
    dbUrl.startsWith("file:") ||
    dbUrl === ":memory:" ||
    dbUrl.startsWith("file://");
  if (isLocalSqlite) {
    applyPragma("PRAGMA journal_mode = WAL");
    applyPragma("PRAGMA synchronous = NORMAL");
    applyPragma("PRAGMA busy_timeout = 5000");
    applyPragma("PRAGMA foreign_keys = ON");
    applyPragma("PRAGMA cache_size = -32000");
  }

  return new Kysely<DatabaseSchema>({
    dialect: new LibSQLDialect({ client }),
  });
}
