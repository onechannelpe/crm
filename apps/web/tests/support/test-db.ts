import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import type { Kysely } from "kysely";

import { createDb } from "../../src/lib/db/client";
import { computeHash, writeStoredHash } from "../../src/lib/db/migration-hash";
import { SCHEMA_MODULES, SEED_MODULES } from "../../src/lib/db/schema";
import type { Database } from "../../src/lib/db/types";
import { createSalesRecordsWorkflowService } from "../../src/server/sales/records-service";
import { createRepositories } from "../../src/server/shared/registry";

const ARTIFACT_DIR = join(process.cwd(), ".vitest-db");

async function seedTemplate(db: Kysely<Database>) {
  const now = Date.now();

  await db
    .insertInto("branches")
    .values([
      { id: 1, name: "Lima", created_at: now },
      { id: 2, name: "Norte", created_at: now },
    ])
    .execute();

  await db
    .insertInto("users")
    .values([
      {
        id: 1,
        branch_id: 1,
        team_id: null,
        username: "exec.one",
        email: "exec1@test.local",
        password_hash: "hash",
        names: "Exec",
        first_surname: "One",
        second_surname: "Alpha",
        phone_e164: "+51990000001",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 2,
        branch_id: 1,
        team_id: null,
        username: "back.one",
        email: "back1@test.local",
        password_hash: "hash",
        names: "Back",
        first_surname: "One",
        second_surname: "Alpha",
        phone_e164: "+51990000002",
        onboarding_completed_at: now,
        role: "back_office",
        is_active: 1,
        created_at: now,
      },
      {
        id: 3,
        branch_id: 2,
        team_id: null,
        username: "exec.two",
        email: "exec2@test.local",
        password_hash: "hash",
        names: "Exec",
        first_surname: "Two",
        second_surname: "Beta",
        phone_e164: "+51990000003",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 4,
        branch_id: 2,
        team_id: null,
        username: "back.two",
        email: "back2@test.local",
        password_hash: "hash",
        names: "Back",
        first_surname: "Two",
        second_surname: "Beta",
        phone_e164: "+51990000004",
        onboarding_completed_at: now,
        role: "back_office",
        is_active: 1,
        created_at: now,
      },
      {
        id: 5,
        branch_id: 2,
        team_id: null,
        username: "super.user",
        email: "super@test.local",
        password_hash: "hash",
        names: "Super",
        first_surname: "User",
        second_surname: "Gamma",
        phone_e164: "+51990000005",
        onboarding_completed_at: now,
        role: "superuser",
        is_active: 1,
        created_at: now,
      },
    ])
    .execute();

  await db
    .insertInto("organizations")
    .values([
      {
        id: 1,
        ruc: "20100000001",
        name: "Org Lima",
        created_at: now,
        locked_branch_id: null,
        locked_at: null,
        locked_by_user_id: null,
      },
      {
        id: 2,
        ruc: "20100000002",
        name: "Org Norte",
        created_at: now,
        locked_branch_id: null,
        locked_at: null,
        locked_by_user_id: null,
      },
    ])
    .execute();

  await db
    .insertInto("contacts")
    .values([
      {
        id: 1,
        organization_id: 1,
        dni: "70000001",
        name: "Contacto Lima",
        phone_primary: "+51999999111",
        phone_secondary: null,
        last_contacted_at: null,
        last_contacted_by_user_id: null,
        cooldown_until: null,
        created_at: now,
      },
      {
        id: 2,
        organization_id: 2,
        dni: "70000002",
        name: "Contacto Norte",
        phone_primary: "+51999999222",
        phone_secondary: null,
        last_contacted_at: null,
        last_contacted_by_user_id: null,
        cooldown_until: null,
        created_at: now,
      },
    ])
    .execute();

  await db
    .insertInto("products")
    .values({
      id: 1,
      name: "Plan Test",
      category: "mobile",
      subtype: "mono",
      price: 10,
      is_active: 1,
    })
    .execute();
}

export interface TestDbContext {
  dbPath: string;
  storageRoot: string;
  db: Kysely<Database>;
  repos: ReturnType<typeof createRepositories>;
  salesRecords: ReturnType<typeof createSalesRecordsWorkflowService>;
}

export async function createIsolatedTestDb(
  prefix: string,
): Promise<TestDbContext> {
  await mkdir(ARTIFACT_DIR, { recursive: true });

  const dbPath = join(
    ARTIFACT_DIR,
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`,
  );
  const storageRoot = join(
    ARTIFACT_DIR,
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}-files`,
  );
  const db = createDb(dbPath);

  for (const module of SCHEMA_MODULES) {
    // eslint-disable-next-line no-await-in-loop
    await module.createTables(db);
  }
  for (const module of SEED_MODULES) {
    // eslint-disable-next-line no-await-in-loop
    await module.run(db);
  }

  const hash = await computeHash(SCHEMA_MODULES, SEED_MODULES);
  await writeStoredHash(db, hash);

  await seedTemplate(db);
  const repos = createRepositories(db);
  const salesRecords = createSalesRecordsWorkflowService(repos, (operation) =>
    db
      .transaction()
      .execute((transactionDb) => operation(createRepositories(transactionDb))),
  );

  return {
    dbPath,
    storageRoot,
    db,
    repos,
    salesRecords,
  };
}

export async function cleanupTestDb(ctx: TestDbContext): Promise<void> {
  await ctx.db.destroy();

  try {
    await rm(ctx.dbPath, { force: true });
    await rm(ctx.storageRoot, { force: true, recursive: true });
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "EBUSY"
    ) {
      throw error;
    }
  }
}
