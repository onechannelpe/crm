import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { sql } from "kysely";
import { afterEach, describe, expect, it } from "vitest";

import { createDb } from "../../src/lib/db/client";
import { migrateToLatest } from "../../src/lib/db/migrate";

const ARTIFACT_DIR = join(process.cwd(), ".vitest-db");

const createdDbPaths: string[] = [];

async function createMigrationTestDb(prefix: string) {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const dbPath = join(
    ARTIFACT_DIR,
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`,
  );
  createdDbPaths.push(dbPath);
  return createDb(dbPath);
}

describe("schema baseline", () => {
  afterEach(async () => {
    const paths = createdDbPaths.splice(0, createdDbPaths.length);
    await Promise.all(paths.map((dbPath) => rm(dbPath, { force: true })));
  });

  it("creates expected schema objects on a fresh database", async () => {
    const db = await createMigrationTestDb("schema-baseline-fresh");
    try {
      await migrateToLatest(db);

      const tables = await sql<{ name: string }>`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
      `.execute(db);
      const tableNames = new Set(tables.rows.map((row) => row.name));
      expect(tableNames.has("users")).toBe(true);
      expect(tableNames.has("search_allowance_ledger")).toBe(true);
      expect(tableNames.has("inventory_items")).toBe(true);
      expect(tableNames.has("audit_logs")).toBe(true);
      expect(tableNames.has("audit_action_policies")).toBe(true);
      expect(tableNames.has("user_invites")).toBe(true);
      expect(tableNames.has("action_observations")).toBe(true);
      expect(tableNames.has("report_export_jobs")).toBe(true);
      expect(tableNames.has("sales_records")).toBe(true);
      expect(tableNames.has("sales_record_attempts")).toBe(true);
      expect(tableNames.has("login_flows")).toBe(true);

      const indexes = await sql<{ name: string }>`
        SELECT name
        FROM sqlite_master
        WHERE type = 'index'
      `.execute(db);
      const indexNames = new Set(indexes.rows.map((row) => row.name));
      expect(indexNames.has("idx_search_allowance_user_period")).toBe(true);
      expect(indexNames.has("idx_app_notifications_dedupe")).toBe(true);
      expect(indexNames.has("idx_audit_created_at")).toBe(true);
      expect(indexNames.has("idx_audit_action_created")).toBe(true);
      expect(indexNames.has("idx_audit_user_created")).toBe(true);
      expect(indexNames.has("idx_audit_policy_risk_active")).toBe(true);
      expect(indexNames.has("idx_report_export_jobs_branch_time")).toBe(true);
      expect(indexNames.has("idx_sales_records_branch_status_time")).toBe(true);
      expect(indexNames.has("idx_sales_record_attempts_record_time")).toBe(
        true,
      );
    } finally {
      await db.destroy();
    }
  });

  it("is idempotent and maintains integrity hash", async () => {
    const db = await createMigrationTestDb("schema-baseline-rerun");
    try {
      await migrateToLatest(db);

      await db
        .insertInto("branches")
        .values({ name: "Lima", created_at: Date.now() })
        .execute();

      // Should not throw and should be no-op because hash matches
      await migrateToLatest(db);

      const branches = await db
        .selectFrom("branches")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .executeTakeFirstOrThrow();
      expect(Number(branches.count)).toBe(1);

      const integrity = await sql<{ migrations_hash: string }>`
        SELECT migrations_hash FROM schema_integrity
      `.execute(db);
      expect(integrity.rows.length).toBe(1);
      expect(integrity.rows[0].migrations_hash).toBeDefined();
    } finally {
      await db.destroy();
    }
  });
});
