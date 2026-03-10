import { sql } from "kysely";
import type { Kysely } from "kysely";

import type { SchemaModule, SeedModule } from "./schema";

export async function computeHash(
  schemas: SchemaModule[],
  seeds: SeedModule[],
): Promise<string> {
  const input = [
    ...schemas.map((m) => m.createTables.toString()),
    ...seeds.map((m) => m.run.toString()),
  ].join("\n");

  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function readStoredHash<T>(db: Kysely<T>): Promise<string | null> {
  try {
    const result = await sql<{
      migrations_hash: string;
    }>`SELECT migrations_hash FROM schema_integrity LIMIT 1`.execute(db);
    return result.rows[0]?.migrations_hash ?? null;
  } catch {
    return null;
  }
}

async function ensureTable<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("schema_integrity")
    .ifNotExists()
    .addColumn("migrations_hash", "text", (col) => col.notNull())
    .execute();
}

export async function writeStoredHash<T>(
  db: Kysely<T>,
  hash: string,
): Promise<void> {
  await ensureTable(db);
  await sql`DELETE FROM schema_integrity`.execute(db);
  await sql`INSERT INTO schema_integrity (migrations_hash) VALUES (${hash})`.execute(
    db,
  );
}
