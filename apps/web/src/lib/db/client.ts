import { createClient } from "@libsql/client";
import { Kysely } from "kysely";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import type { Database as DatabaseSchema } from "./schema";

export function createDb(path: string): Kysely<DatabaseSchema> {
  const client = createClient({
    url: `file:${path}`,
    intMode: "number",
  });

  const applyPragma = (statement: string) => {
    void client.execute(statement).catch((error: unknown) => {
      console.error(`Failed to apply PRAGMA: ${statement}`, error);
    });
  };

  applyPragma("PRAGMA journal_mode = WAL");
  applyPragma("PRAGMA synchronous = NORMAL");
  applyPragma("PRAGMA busy_timeout = 5000");
  applyPragma("PRAGMA foreign_keys = ON");
  applyPragma("PRAGMA cache_size = -32000");

  return new Kysely<DatabaseSchema>({
    dialect: new LibsqlDialect({ client }),
  });
}
