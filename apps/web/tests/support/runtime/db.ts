import { rm } from "node:fs/promises";
import { join } from "node:path";

import { sql, type Kysely } from "kysely";
import { Client } from "pg";

import {
  SETTLEMENT_BANKS,
  ACCOUNT_TYPE_KINDS,
  COLLECTION_MODES,
  CURRENCIES,
} from "~/contracts/workflow/vocabulary";
import { createDb } from "~/lib/db/client";
import { migrateToLatest } from "~/lib/db/migrate";
import { BOOTSTRAP_SEED_MODULES } from "~/lib/db/schema";
import type { Database } from "~/lib/db/types";
import {
  BranchId,
  OrganizationId,
  OrganizationPersonId,
  PersonId,
  UserId,
} from "~/server/shared/ids";

import {
  createTestRepositories,
  type TestRepositories,
} from "../runtime/repos";

// Postgres test isolation: build one seeded template database, then
// `CREATE DATABASE <clone> TEMPLATE <template>` once per test FILE (not per
// test, matching graphile-worker's own test harness pattern).
// Individual tests within a file share that one clone and are isolated from
// each other by `resetTestDb`, which truncates everything dynamic and
// reseeds fixtures. No DDL, safe under Vitest's default
// sequential-within-file execution. Cloning requires the template to have no
// live connections, so the template pool is destroyed after seeding and
// tests never connect to it directly.
const NAMESPACE = (process.env.TEST_DB_NAMESPACE ?? "default").replace(
  /[^a-z0-9_]/gi,
  "_",
);
const TEMPLATE_DB_NAME = `crm_test_template_${NAMESPACE}`.toLowerCase();

// Maintenance/base connection. Per-test databases are derived by swapping the
// database segment of this URL. Points at the `postgres` admin database so we
// can CREATE/DROP other databases.
const BASE_URL =
  process.env.TEST_WEB_DB_URL ??
  process.env.WEB_DB_URL ??
  "postgres://postgres@localhost:5432/postgres";

// Stable advisory-lock key so concurrent vitest workers serialize template
// creation across processes.
const TEMPLATE_LOCK_KEY = 0x6372_6d74; // "crmt"

const TEST_ORG_ID_LIMA = OrganizationId.trust(
  "01974fd5-f261-7a7d-93f5-2f3d0f963001",
);
const TEST_ORG_ID_NORTE = OrganizationId.trust(
  "01974fd5-f261-7a7d-93f5-2f3d0f963002",
);

const BRANCH_LIMA_ID = BranchId.trust("01974fd5-f261-7a7d-93f5-2f3d0f960001");
const BRANCH_NORTE_ID = BranchId.trust("01974fd5-f261-7a7d-93f5-2f3d0f960002");

const USER_EXEC_ONE_ID = UserId.trust("01974fd5-f261-7a7d-93f5-2f3d0f961001");
const USER_BACK_ONE_ID = UserId.trust("01974fd5-f261-7a7d-93f5-2f3d0f961002");
const USER_EXEC_TWO_ID = UserId.trust("01974fd5-f261-7a7d-93f5-2f3d0f961003");
const USER_BACK_TWO_ID = UserId.trust("01974fd5-f261-7a7d-93f5-2f3d0f961004");
const USER_SUPER_ID = UserId.trust("01974fd5-f261-7a7d-93f5-2f3d0f961005");

const PERSON_LIMA_ID = PersonId.trust("01974fd5-f261-7a7d-93f5-2f3d0f962001");
const PERSON_NORTE_ID = PersonId.trust("01974fd5-f261-7a7d-93f5-2f3d0f962002");

const ORG_PERSON_LIMA_ID = OrganizationPersonId.trust(
  "01974fd5-f261-7a7d-93f5-2f3d0f964001",
);
const ORG_PERSON_NORTE_ID = OrganizationPersonId.trust(
  "01974fd5-f261-7a7d-93f5-2f3d0f964002",
);

export const TEST_FIXTURES = {
  branches: {
    lima: { id: BRANCH_LIMA_ID },
    norte: { id: BRANCH_NORTE_ID },
  },
  users: {
    execOne: { id: USER_EXEC_ONE_ID, branchId: BRANCH_LIMA_ID },
    backOne: { id: USER_BACK_ONE_ID, branchId: BRANCH_LIMA_ID },
    execTwo: { id: USER_EXEC_TWO_ID, branchId: BRANCH_NORTE_ID },
    backTwo: { id: USER_BACK_TWO_ID, branchId: BRANCH_NORTE_ID },
    superUser: { id: USER_SUPER_ID, branchId: BRANCH_NORTE_ID },
  },
  organizations: {
    lima: { id: TEST_ORG_ID_LIMA, ruc: "20100000001" },
    norte: { id: TEST_ORG_ID_NORTE, ruc: "20100000002" },
  },
  people: {
    lima: { id: PERSON_LIMA_ID, dni: "70000001" },
    norte: { id: PERSON_NORTE_ID, dni: "70000002" },
  },
  organizationPeople: {
    lima: { id: ORG_PERSON_LIMA_ID },
    norte: { id: ORG_PERSON_NORTE_ID },
  },
} as const;

function databaseUrl(name: string): string {
  const url = new URL(BASE_URL);
  url.pathname = `/${name}`;
  return url.toString();
}

function assertSafeDbName(name: string): void {
  if (!/^[a-z0-9_]+$/.test(name)) {
    throw new Error(`unsafe database name: ${name}`);
  }
}

async function withMaintenanceClient<T>(
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString: databaseUrl("postgres") });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// Vocabulary lookup tables (currency/account-type/settlement-bank/collection
// mode). Genuinely static reference data: nothing in the app or the test
// suite ever writes to these outside migration seeding, so they're seeded
// once at template-build time and excluded from `resetTestDb`'s truncation.
async function seedVocabulary(db: Kysely<Database>) {
  await db
    .insertInto("workflow_collection_mode_kinds")
    .values(COLLECTION_MODES.map((value) => ({ value })))
    .execute();

  await db
    .insertInto("workflow_currency_kinds")
    .values(CURRENCIES.map((value) => ({ value })))
    .execute();

  await db
    .insertInto("workflow_account_type_kinds")
    .values(ACCOUNT_TYPE_KINDS.map((value) => ({ value })))
    .execute();

  await db
    .insertInto("workflow_settlement_banks")
    .values(SETTLEMENT_BANKS.map((value) => ({ value })))
    .execute();
}

// Test-harness fixture rows (branches/users/organizations/people). Unlike
// vocabulary data, tests can mutate these (e.g. a profile-update command), so
// this runs both at template-build time and on every `resetTestDb` call to
// restore the baseline before each test.
async function seedFixtures(db: Kysely<Database>) {
  const now = new Date();

  await db
    .insertInto("branches")
    .values([
      { id: BRANCH_LIMA_ID, name: "Lima", created_at: now },
      { id: BRANCH_NORTE_ID, name: "Norte", created_at: now },
    ])
    .execute();

  await db
    .insertInto("users")
    .values([
      {
        id: USER_EXEC_ONE_ID,
        branch_id: BRANCH_LIMA_ID,
        team_id: null,
        username: "exec.one",
        email: "exec1@test.local",
        password_hash: "hash",
        names: "Exec",
        first_surname: "One",
        second_surname: "Alpha",
        onboarding_completed_at: now,
        role: "executive",
        is_active: true,
        created_at: now,
      },
      {
        id: USER_BACK_ONE_ID,
        branch_id: BRANCH_LIMA_ID,
        team_id: null,
        username: "back.one",
        email: "back1@test.local",
        password_hash: "hash",
        names: "Back",
        first_surname: "One",
        second_surname: "Alpha",
        onboarding_completed_at: now,
        role: "back_office",
        is_active: true,
        created_at: now,
      },
      {
        id: USER_EXEC_TWO_ID,
        branch_id: BRANCH_NORTE_ID,
        team_id: null,
        username: "exec.two",
        email: "exec2@test.local",
        password_hash: "hash",
        names: "Exec",
        first_surname: "Two",
        second_surname: "Beta",
        onboarding_completed_at: now,
        role: "executive",
        is_active: true,
        created_at: now,
      },
      {
        id: USER_BACK_TWO_ID,
        branch_id: BRANCH_NORTE_ID,
        team_id: null,
        username: "back.two",
        email: "back2@test.local",
        password_hash: "hash",
        names: "Back",
        first_surname: "Two",
        second_surname: "Beta",
        onboarding_completed_at: now,
        role: "back_office",
        is_active: true,
        created_at: now,
      },
      {
        id: USER_SUPER_ID,
        branch_id: BRANCH_NORTE_ID,
        team_id: null,
        username: "super.user",
        email: "super@test.local",
        password_hash: "hash",
        names: "Super",
        first_surname: "User",
        second_surname: "Gamma",
        onboarding_completed_at: now,
        role: "superuser",
        is_active: true,
        created_at: now,
      },
    ])
    .execute();

  await db
    .insertInto("organizations")
    .values([
      {
        id: TEST_ORG_ID_LIMA,
        ruc: "20100000001",
        legal_name: "Org Lima",
        line_of_business: null,
        address: null,
        district: null,
        province: null,
        department: null,
        phone: null,
        email: null,
        created_at: now,
      },
      {
        id: TEST_ORG_ID_NORTE,
        ruc: "20100000002",
        legal_name: "Org Norte",
        line_of_business: null,
        address: null,
        district: null,
        province: null,
        department: null,
        phone: null,
        email: null,
        created_at: now,
      },
    ])
    .execute();

  await db
    .insertInto("people")
    .values([
      {
        id: PERSON_LIMA_ID,
        dni: "70000001",
        names: "Contacto",
        first_surname: "Lima",
        second_surname: null,
        email: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: PERSON_NORTE_ID,
        dni: "70000002",
        names: "Contacto",
        first_surname: "Norte",
        second_surname: null,
        email: null,
        created_at: now,
        updated_at: now,
      },
    ])
    .execute();

  await db
    .insertInto("organization_people")
    .values([
      {
        id: ORG_PERSON_LIMA_ID,
        person_id: PERSON_LIMA_ID,
        organization_id: TEST_ORG_ID_LIMA,
        phone: "999999111",
        email: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: ORG_PERSON_NORTE_ID,
        person_id: PERSON_NORTE_ID,
        organization_id: TEST_ORG_ID_NORTE,
        phone: "999999222",
        email: null,
        created_at: now,
        updated_at: now,
      },
    ])
    .execute();
}

export interface TestDbContext {
  dbName: string;
  storageRoot: string;
  db: Kysely<Database>;
  repos: TestRepositories;
  fixtures: typeof TEST_FIXTURES;
}

let templatePromise: Promise<void> | null = null;

async function templateExists(client: Client): Promise<boolean> {
  const result = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [TEMPLATE_DB_NAME],
  );
  return result.rowCount === 1;
}

async function buildTemplate(): Promise<void> {
  assertSafeDbName(TEMPLATE_DB_NAME);

  await withMaintenanceClient(async (client) => {
    // Serialize across vitest worker processes: only one builds the template.
    await client.query("SELECT pg_advisory_lock($1)", [TEMPLATE_LOCK_KEY]);
    try {
      if (await templateExists(client)) {
        return;
      }
      await client.query(`CREATE DATABASE "${TEMPLATE_DB_NAME}"`);

      try {
        const db = createDb(databaseUrl(TEMPLATE_DB_NAME));
        try {
          await migrateToLatest(db);
          await seedVocabulary(db);
          await seedFixtures(db);
        } finally {
          // Drop the seeding connection so the database can serve as a template.
          await db.destroy();
        }
      } catch (error) {
        // templateExists only checks that the pg_database row exists, not
        // that seeding actually finished. Without this, a template that dies
        // mid-migrate/seed (crash, killed run) leaves a half-built database
        // registered as "done", and every future run silently reuses the
        // broken template forever. Drop it so the next run rebuilds cleanly.
        await client.query(
          `DROP DATABASE IF EXISTS "${TEMPLATE_DB_NAME}" WITH (FORCE)`,
        );
        throw error;
      }
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [TEMPLATE_LOCK_KEY]);
    }
  });
}

async function ensureTemplate(): Promise<void> {
  if (!templatePromise) {
    templatePromise = buildTemplate().catch((error) => {
      templatePromise = null;
      throw error;
    });
  }
  return templatePromise;
}

export async function prepareTestDbTemplate(): Promise<void> {
  await ensureTemplate();
}

export async function createIsolatedTestDb(
  prefix: string,
): Promise<TestDbContext> {
  await ensureTemplate();

  const runId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const dbName = `crm_test_${prefix}_${runId}`
    .replace(/[^a-z0-9_]/gi, "_")
    .toLowerCase();
  assertSafeDbName(dbName);

  await withMaintenanceClient(async (client) => {
    await client.query(
      `CREATE DATABASE "${dbName}" TEMPLATE "${TEMPLATE_DB_NAME}"`,
    );
  });

  const storageRoot = join(
    process.cwd(),
    ".vitest-files",
    `${prefix}-${runId}`,
  );
  const db = createDb(databaseUrl(dbName));
  const repos = createTestRepositories(db);

  return {
    dbName,
    storageRoot,
    db,
    repos,
    fixtures: TEST_FIXTURES,
  };
}

// Vocabulary tables are seeded once at template-build time and never written
// to by app or test code (verified: only `seedVocabulary` inserts into
// them), so they're excluded from truncation. `schema_integrity` is the
// migration hash marker and is irrelevant post-clone.
const STATIC_TABLES = new Set([
  "schema_integrity",
  "workflow_collection_mode_kinds",
  "workflow_currency_kinds",
  "workflow_account_type_kinds",
  "workflow_settlement_banks",
]);

async function truncateDynamicTables(db: Kysely<Database>): Promise<void> {
  const { rows } = await sql<{ tablename: string }>`
    select tablename from pg_tables where schemaname = 'public'
  `.execute(db);

  const targets = rows
    .map((row) => row.tablename)
    .filter((name) => !STATIC_TABLES.has(name));

  if (targets.length === 0) return;

  await sql`truncate table ${sql.join(targets.map((name) => sql.table(name)))} cascade`.execute(
    db,
  );
}

// Isolates individual tests within a file-scoped `TestDbContext` (see
// `createIsolatedTestDb`'s module comment). Cheap: no DDL, just a truncate +
// a handful of inserts, restoring exactly the state a fresh clone would have
// had. Run this in `beforeEach`, not `beforeAll`.
export async function resetTestDb(ctx: TestDbContext): Promise<void> {
  await truncateDynamicTables(ctx.db);
  for (const module of BOOTSTRAP_SEED_MODULES) {
    // eslint-disable-next-line no-await-in-loop
    await module.run(ctx.db);
  }
  await seedFixtures(ctx.db);
}

export async function cleanupTestDb(
  ctx: TestDbContext | null | undefined,
): Promise<void> {
  if (!ctx) {
    return;
  }

  await ctx.db.destroy();
  assertSafeDbName(ctx.dbName);

  await withMaintenanceClient(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS "${ctx.dbName}" WITH (FORCE)`);
  });

  await rm(ctx.storageRoot, { force: true, recursive: true });
}

export interface FreshDbContext {
  dbName: string;
  db: Kysely<Database>;
}

// Empty, unmigrated databases are not cloned from the fixture template. Use
// these for migration/seeding tests, not app behavior against seeded fixtures.
export async function createFreshDb(prefix: string): Promise<FreshDbContext> {
  const dbName = `crm_test_fresh_${prefix}_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}`
    .replace(/[^a-z0-9_]/gi, "_")
    .toLowerCase();
  assertSafeDbName(dbName);

  await withMaintenanceClient(async (client) => {
    await client.query(`CREATE DATABASE "${dbName}"`);
  });

  return { dbName, db: createDb(databaseUrl(dbName)) };
}

export async function cleanupFreshDb(
  ctx: FreshDbContext | null | undefined,
): Promise<void> {
  if (!ctx) {
    return;
  }

  await ctx.db.destroy();
  assertSafeDbName(ctx.dbName);

  await withMaintenanceClient(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS "${ctx.dbName}" WITH (FORCE)`);
  });
}
