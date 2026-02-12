import { Migrator, FileMigrationProvider } from "kysely";
import { db } from "./client";
import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function migrateToLatest() {
    const migrator = new Migrator({
        db,
        provider: new FileMigrationProvider({
            fs,
            path: { join },
            migrationFolder: join(__dirname, "migrations"),
        }),
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
