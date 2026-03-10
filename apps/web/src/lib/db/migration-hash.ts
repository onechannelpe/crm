import { sql } from "kysely";
import type { Kysely } from "kysely";

// Computes a SHA-256 hex digest over all schema and seed function sources concatenated in
// file-name order. Any edit to a schema or seed body changes this hash.
export async function computeMigrationsHash(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modules: Record<
    string,
    {
      createTables?: (...args: any[]) => unknown;
      run?: (...args: any[]) => unknown;
    }
  >,
): Promise<string> {
  const input = Object.keys(modules)
    .sort()
    .map((name) => {
      const mod = modules[name];
      const fn = mod.createTables || mod.run;
      return fn ? `${name}:${fn.toString()}` : name;
    })
    .join("\n");

  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function readStoredHash<T>(db: Kysely<T>): Promise<string | null> {
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

async function writeHash<T>(db: Kysely<T>, hash: string): Promise<void> {
  await ensureTable(db);
  await sql`DELETE FROM schema_integrity`.execute(db);
  await sql`INSERT INTO schema_integrity (migrations_hash) VALUES (${hash})`.execute(
    db,
  );
}

/**
 * Call before running migrations.
 *
 * - Fresh DB (no stored hash): skip check, let migrations run, then write hash after.
 * - Existing DB with hash: compare against current source hash.
 *   Mismatch ⇢ throw with actionable message.
 *   Match ⇢ no-op.
 */
export async function checkIntegrityHash<T>(
  db: Kysely<T>,
  currentHash: string,
): Promise<boolean> {
  const stored = await readStoredHash(db);
  if (stored === null) return false; // for fresh dbs, it'll be written after migrations
  if (stored !== currentHash) {
    throw new Error(
      `Migration files have changed since this database was built.\n` +
        `  ⇢ Delete crm.db and rerun: bun dev`,
    );
  }
  return true;
}

export async function writeIntegrityHash<T>(
  db: Kysely<T>,
  hash: string,
): Promise<void> {
  await writeHash(db, hash);
}
