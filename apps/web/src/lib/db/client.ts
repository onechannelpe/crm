import { createClient } from "@libsql/client";
import { Kysely } from "kysely";
import { LibSQLDialect } from "kysely-turso/libsql";

import { createLogger } from "~/lib/observability/logger";

import type { Database as DatabaseSchema } from "./types";

const logger = createLogger("db-client");

function normalizeDbUrl(input: string): string {
  if (input === ":memory:") {
    return input;
  }
  if (
    input.startsWith("http://") ||
    input.startsWith("https://") ||
    input.startsWith("libsql://") ||
    input.startsWith("file:")
  ) {
    return input;
  }
  return `file:${input}`;
}

export function createDb(dbUrl: string): Kysely<DatabaseSchema> {
  const normalizedUrl = normalizeDbUrl(dbUrl);
  logger.info("db_initialization_started", { url: normalizedUrl });

  const client = createClient({
    url: normalizedUrl,
    intMode: "number",
  });

  return new Kysely<DatabaseSchema>({
    dialect: new LibSQLDialect({ client }),
  });
}
