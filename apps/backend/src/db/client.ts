import { Kysely, SqliteDialect } from "kysely";
import SQLite from "better-sqlite3";
import type { Database } from "./schema";

const sqlite = new SQLite("core.db");

sqlite.pragma("PRAGMA journal_mode = WAL");
sqlite.pragma("PRAGMA foreign_keys = ON");

export const db = new Kysely<Database>({
	dialect: new SqliteDialect({
		database: sqlite,
	}),
});
