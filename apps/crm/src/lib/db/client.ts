import { Database } from "bun:sqlite";

let db: Database;

if (!db!) {
  db = new Database("local.db", { create: true });
  db.run("PRAGMA journal_mode = WAL;");
  db.run("PRAGMA foreign_keys = ON;");
}

export { db };
