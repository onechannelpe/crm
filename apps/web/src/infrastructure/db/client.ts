import SQLite from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import type { Database } from "./schema";

const sqlite = new SQLite("crm.db");

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("synchronous = NORMAL");
sqlite.pragma("busy_timeout = 5000");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("cache_size = -32000");

export const db = new Kysely<Database>({
  dialect: new SqliteDialect({
    database: sqlite,
  }),
});
