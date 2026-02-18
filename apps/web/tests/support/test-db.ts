import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import type { Kysely } from "kysely";

import { createDb } from "../../src/lib/db/client";
import { up as up001 } from "../../src/lib/db/migrations/001-initial";
import { up as up002 } from "../../src/lib/db/migrations/002-client-search-views";
import { up as up003 } from "../../src/lib/db/migrations/003-user-invites";
import { up as up004 } from "../../src/lib/db/migrations/004-action-observability";
import type { Database } from "../../src/lib/db/schema";
import { createAppNotificationCenter } from "../../src/server/notifications/app-center-service";
import { createSalesWorkflowService } from "../../src/server/sales/service";
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
        email: "exec1@test.local",
        password_hash: "hash",
        full_name: "Exec 1",
        phone_e164: "+51990000001",
        phone_verified_at: now,
        profile_confirmed_at: now,
        onboarding_completed_at: now,
        strong_auth_required: 0,
        strong_auth_enrolled_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 2,
        branch_id: 1,
        team_id: null,
        email: "back1@test.local",
        password_hash: "hash",
        full_name: "Back 1",
        phone_e164: "+51990000002",
        phone_verified_at: now,
        profile_confirmed_at: now,
        onboarding_completed_at: now,
        strong_auth_required: 0,
        strong_auth_enrolled_at: null,
        role: "back_office",
        is_active: 1,
        created_at: now,
      },
      {
        id: 3,
        branch_id: 2,
        team_id: null,
        email: "exec2@test.local",
        password_hash: "hash",
        full_name: "Exec 2",
        phone_e164: "+51990000003",
        phone_verified_at: now,
        profile_confirmed_at: now,
        onboarding_completed_at: now,
        strong_auth_required: 0,
        strong_auth_enrolled_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 4,
        branch_id: 2,
        team_id: null,
        email: "back2@test.local",
        password_hash: "hash",
        full_name: "Back 2",
        phone_e164: "+51990000004",
        phone_verified_at: now,
        profile_confirmed_at: now,
        onboarding_completed_at: now,
        strong_auth_required: 0,
        strong_auth_enrolled_at: null,
        role: "back_office",
        is_active: 1,
        created_at: now,
      },
      {
        id: 5,
        branch_id: 2,
        team_id: null,
        email: "super@test.local",
        password_hash: "hash",
        full_name: "Super User",
        phone_e164: "+51990000005",
        phone_verified_at: now,
        profile_confirmed_at: now,
        onboarding_completed_at: now,
        strong_auth_required: 1,
        strong_auth_enrolled_at: null,
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
  db: Kysely<Database>;
  repos: ReturnType<typeof createRepositories>;
  sales: ReturnType<typeof createSalesWorkflowService>;
}

export async function createIsolatedTestDb(
  prefix: string,
): Promise<TestDbContext> {
  await mkdir(ARTIFACT_DIR, { recursive: true });

  const dbPath = join(
    ARTIFACT_DIR,
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`,
  );
  const db = createDb(dbPath);
  await up001(db);
  await up002(db);
  await up003(db);
  await up004(db);
  await seedTemplate(db);
  const repos = createRepositories(db);
  const notifications = createAppNotificationCenter({
    repos: { appNotifications: repos.appNotifications, users: repos.users },
  });
  const sales = createSalesWorkflowService(repos, { notifications });

  return { dbPath, db, repos, sales };
}

export async function cleanupTestDb(ctx: TestDbContext): Promise<void> {
  await ctx.db.destroy();

  try {
    await rm(ctx.dbPath, { force: true });
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
