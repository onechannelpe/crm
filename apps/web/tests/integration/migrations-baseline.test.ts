import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { Migrator, type MigrationProvider, sql } from "kysely";
import { afterEach, describe, expect, it } from "vitest";

import { createDb } from "../../src/lib/db/client";
import * as m001 from "../../src/lib/db/migrations/001-initial";
import * as m002 from "../../src/lib/db/migrations/002-client-search-views";
import * as m003 from "../../src/lib/db/migrations/003-user-invites";
import * as m004 from "../../src/lib/db/migrations/004-action-observability";
import * as m005 from "../../src/lib/db/migrations/005-report-export-observability";
import * as m006 from "../../src/lib/db/migrations/006-sales-records-core";

const ARTIFACT_DIR = join(process.cwd(), ".vitest-db");

const staticProvider: MigrationProvider = {
  async getMigrations() {
    return {
      "001-initial": m001,
      "002-client-search-views": m002,
      "003-user-invites": m003,
      "004-action-observability": m004,
      "005-report-export-observability": m005,
      "006-sales-records-core": m006,
    };
  },
};

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

describe("migration baseline", () => {
  afterEach(async () => {
    const paths = createdDbPaths.splice(0, createdDbPaths.length);
    await Promise.all(paths.map((dbPath) => rm(dbPath, { force: true })));
  });

  it("creates expected schema objects on a fresh database", async () => {
    const db = await createMigrationTestDb("migration-baseline-fresh");
    try {
      const migrator = new Migrator({ db, provider: staticProvider });
      const { error } = await migrator.migrateToLatest();
      expect(error).toBeUndefined();

      const tables = await sql<{ name: string }>`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
      `.execute(db);
      const tableNames = new Set(tables.rows.map((row) => row.name));
      expect(tableNames.has("users")).toBe(true);
      expect(tableNames.has("quota_allocations")).toBe(true);
      expect(tableNames.has("inventory_items")).toBe(true);
      expect(tableNames.has("audit_logs")).toBe(true);
      expect(tableNames.has("audit_action_policies")).toBe(true);
      expect(tableNames.has("user_invites")).toBe(true);
      expect(tableNames.has("action_observations")).toBe(true);
      expect(tableNames.has("report_export_jobs")).toBe(true);
      expect(tableNames.has("sales_records")).toBe(true);
      expect(tableNames.has("sales_record_attempts")).toBe(true);

      const indexes = await sql<{ name: string }>`
        SELECT name
        FROM sqlite_master
        WHERE type = 'index'
      `.execute(db);
      const indexNames = new Set(indexes.rows.map((row) => row.name));
      expect(indexNames.has("idx_quota_user_date")).toBe(true);
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

  it("is idempotent and does not reapply executed migrations", async () => {
    const db = await createMigrationTestDb("migration-baseline-rerun");
    try {
      const migrator = new Migrator({ db, provider: staticProvider });
      const first = await migrator.migrateToLatest();
      expect(first.error).toBeUndefined();

      await db
        .insertInto("branches")
        .values({ name: "Lima", created_at: Date.now() })
        .execute();

      const second = await migrator.migrateToLatest();
      expect(second.error).toBeUndefined();

      const branches = await db
        .selectFrom("branches")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .executeTakeFirstOrThrow();
      expect(Number(branches.count)).toBe(1);

      const migrationTables = await sql<{ name: string }>`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name IN ('kysely_migration', '__kysely_migration')
      `.execute(db);
      const migrationTableName = migrationTables.rows[0]?.name;
      expect(migrationTableName).toBe("kysely_migration");

      const migrations = await sql<{ name: string }>`
        SELECT name
        FROM kysely_migration
        ORDER BY name ASC
      `.execute(db);
      expect(migrations.rows).toEqual([
        { name: "001-initial" },
        { name: "002-client-search-views" },
        { name: "003-user-invites" },
        { name: "004-action-observability" },
        { name: "005-report-export-observability" },
        { name: "006-sales-records-core" },
      ]);
    } finally {
      await db.destroy();
    }
  });
});
