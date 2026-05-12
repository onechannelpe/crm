import { copyFile, mkdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";

import { sql, type Kysely } from "kysely";

import { createDb } from "~/lib/db/client";
import { migrateToLatest } from "~/lib/db/migrate";
import type { Database } from "~/lib/db/types";
import {
  ABONO_BANKS,
  ACCOUNT_TYPE_KINDS,
  MODALIDAD_COBRO_KINDS,
  MONEDAS,
} from "~/workflow/contracts/lead-schema";

import {
  createTestRepositories,
  type TestRepositories,
} from "../runtime/repos";

const ARTIFACT_DIR = join(process.cwd(), ".vitest-db");
const TEMPLATE_DB_NAME = "__template-seeded.db";
const TEST_ORG_ID_LIMA = "01974fd5-f261-7a7d-93f5-2f3d0f963001";
const TEST_ORG_ID_NORTE = "01974fd5-f261-7a7d-93f5-2f3d0f963002";

export const TEST_FIXTURES = {
  organizations: {
    lima: { id: TEST_ORG_ID_LIMA, ruc: "20100000001" },
    norte: { id: TEST_ORG_ID_NORTE, ruc: "20100000002" },
  },
} as const;

let templateDbPathPromise: Promise<string> | null = null;

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
        id: TEST_ORG_ID_LIMA,
        ruc: "20100000001",
        name: "Org Lima",
        created_at: now,
        locked_branch_id: null,
        locked_at: null,
        locked_by_user_id: null,
      },
      {
        id: TEST_ORG_ID_NORTE,
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
        organization_id: TEST_ORG_ID_LIMA,
        dni: "70000001",
        name: "Contacto Lima",
        phone_primary: "999999111",
        phone_secondary: null,
        last_contacted_at: null,
        last_contacted_by_user_id: null,
        cooldown_until: null,
        created_at: now,
      },
      {
        id: 2,
        organization_id: TEST_ORG_ID_NORTE,
        dni: "70000002",
        name: "Contacto Norte",
        phone_primary: "999999222",
        phone_secondary: null,
        last_contacted_at: null,
        last_contacted_by_user_id: null,
        cooldown_until: null,
        created_at: now,
      },
    ])
    .execute();

  await db
    .insertInto("workflow_modalidad_cobro_kinds")
    .values(MODALIDAD_COBRO_KINDS.map((value) => ({ value })))
    .execute();

  await db
    .insertInto("workflow_currency_kinds")
    .values(MONEDAS.map((value) => ({ value })))
    .execute();

  await db
    .insertInto("workflow_account_type_kinds")
    .values(ACCOUNT_TYPE_KINDS.map((value) => ({ value })))
    .execute();

  await db
    .insertInto("workflow_abono_banks")
    .values(ABONO_BANKS.map((value) => ({ value })))
    .execute();
}

export interface TestDbContext {
  dbPath: string;
  storageRoot: string;
  db: Kysely<Database>;
  repos: TestRepositories;
  fixtures: typeof TEST_FIXTURES;
}

async function buildSeededTemplateDb(templateDbPath: string): Promise<void> {
  const db = createDb(templateDbPath);

  try {
    await sql`PRAGMA journal_mode=DELETE`.execute(db);

    await migrateToLatest(db);

    await seedTemplate(db);
    await sql`PRAGMA wal_checkpoint(TRUNCATE)`.execute(db);
  } finally {
    await db.destroy();
  }
}

async function ensureSeededTemplateDb(): Promise<string> {
  if (templateDbPathPromise) {
    return templateDbPathPromise;
  }

  templateDbPathPromise = (async () => {
    await mkdir(ARTIFACT_DIR, { recursive: true });
    const templateDbPath = join(ARTIFACT_DIR, TEMPLATE_DB_NAME);

    try {
      await stat(templateDbPath);
      return templateDbPath;
    } catch {
      const tempTemplateDbPath = join(
        ARTIFACT_DIR,
        `${TEMPLATE_DB_NAME}.tmp-${process.pid}-${Date.now()}`,
      );
      await buildSeededTemplateDb(tempTemplateDbPath);
      await rename(tempTemplateDbPath, templateDbPath);
      return templateDbPath;
    }
  })();

  try {
    return await templateDbPathPromise;
  } catch (error) {
    templateDbPathPromise = null;
    throw error;
  }
}

export async function prepareTestDbTemplate(): Promise<void> {
  await ensureSeededTemplateDb();
}

export async function createIsolatedTestDb(
  prefix: string,
): Promise<TestDbContext> {
  const templateDbPath = await ensureSeededTemplateDb();
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const dbPath = join(ARTIFACT_DIR, `${prefix}-${runId}.db`);
  const storageRoot = join(ARTIFACT_DIR, `${prefix}-${runId}-files`);
  await copyFile(templateDbPath, dbPath);
  const db = createDb(dbPath);
  const repos = createTestRepositories(db);

  return {
    dbPath,
    storageRoot,
    db,
    repos,
    fixtures: TEST_FIXTURES,
  };
}

export async function cleanupTestDb(
  ctx: TestDbContext | null | undefined,
): Promise<void> {
  if (!ctx) {
    return;
  }

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
