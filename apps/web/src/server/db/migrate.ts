import { promises as fs } from "node:fs";
import path from "node:path";
import SQLite from "better-sqlite3";
import { FileMigrationProvider, Kysely, Migrator, SqliteDialect } from "kysely";

export async function migrateToLatest() {
  const sqlite = new SQLite("core.db");
  
  const migrationDb = new Kysely({
    dialect: new SqliteDialect({
      database: sqlite,
    }),
  });

  const migrator = new Migrator({
    db: migrationDb,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(path.dirname(new URL(import.meta.url).pathname), "migrations"),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === "Success") {
      console.log(`Migration "${it.migrationName}" executed successfully`);
    } else if (it.status === "Error") {
      console.error(`Failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error("Failed to migrate");
    console.error(error);
    await migrationDb.destroy();
    sqlite.close();
    throw error;
  }

  await migrationDb.destroy();
  sqlite.close();
}

if (import.meta.main) {
  migrateToLatest()
    .then(() => {
      console.log("Migrations complete");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
