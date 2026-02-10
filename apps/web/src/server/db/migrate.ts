import { promises as fs } from "node:fs";
import path from "node:path";
import { FileMigrationProvider, Kysely, Migrator } from "kysely";
import { BunSqliteDialect } from "kysely-bun-worker/normal";

export async function migrateToLatest() {
  const migrationDb = new Kysely({
    dialect: new BunSqliteDialect({
      url: "core.db",
      dbOptions: { strict: true, create: true },
    }),
  });

  const migrator = new Migrator({
    db: migrationDb,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(import.meta.dir, "migrations"),
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
    throw error;
  }

  await migrationDb.destroy();
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
