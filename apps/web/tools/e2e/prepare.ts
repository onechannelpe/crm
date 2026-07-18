// e2e provisioning. globalSetup spawns this as its own `bun` child so the heavy,
// one-time work (building the app, migrating + seeding a template database) runs
// in isolation and never loads the app's module graph, or its import-time side
// effects, into the long-lived Playwright runner. Everything the test side needs
// afterwards is frozen into .e2e-manifest.json as plain data, the only handoff
// Playwright offers from global setup to worker processes.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

import { sql, type Kysely } from "kysely";
import { Client } from "pg";

import { hashPassword } from "~/lib/auth/password/password";
import {
  hashSessionToken,
  isValidTokenFormat,
} from "~/lib/auth/session/tokens";
import { createDb } from "~/lib/db/client";
import { migrateToLatest } from "~/lib/db/migrate";
import { provisionInstallation } from "~/lib/db/seeds/installation";
import { INFINITY_BRANCH_ID } from "~/lib/db/seeds/installation/persist/branches-policies";
import { createSeedContext } from "~/lib/db/seeds/shared/context";
import type { Database } from "~/lib/db/types";
import { TeamId, UserId } from "~/server/shared/ids";

import { withDatabase } from "../../tests/e2e/db";
import {
  type E2EManifest,
  type GuardCount,
  type ResetPlan,
  writeManifest,
} from "../../tests/e2e/manifest";
import { ROSTER } from "../../tests/e2e/roster";

const TEMPLATE_DB = "crm_e2e_template";
const WORKER_DB_PREFIX = "crm_e2e_w";
const BUILD_HASH_FILE = resolve(process.cwd(), ".output/.e2e-build-hash");
const SERVER_ENTRY = resolve(process.cwd(), ".output/server/index.mjs");
const ROSTER_PASSWORD = "E2ePassw0rd!";
// The executive role requires strict team hierarchy (resolveWorkspaceContext),
// so its roster user must belong to a team on the installation branch.
const E2E_TEAM_ID = TeamId.trust("0e2e0000-0000-7000-8000-0000000000a1");

function baseUrl(): string {
  const url = process.env.WEB_DB_URL;
  if (!url) {
    throw new Error(
      "WEB_DB_URL is not set; run e2e via the test:e2e script so .env.test is loaded",
    );
  }
  return url;
}

async function withMaintenance<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const client = new Client({
    connectionString: withDatabase(baseUrl(), "postgres"),
  });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `Postgres is not reachable at ${withDatabase(baseUrl(), "postgres")}. ` +
        "Start it first (e.g. `bun run dev:infra` from the repo root).",
      { cause: error },
    );
  }
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// A crashed run can leak worker databases; clear them (and the old template)
// before rebuilding so CREATE DATABASE ... TEMPLATE sees no stragglers holding
// connections.
async function dropStaleDatabases(client: Client): Promise<void> {
  const { rows } = await client.query<{ datname: string }>(
    `SELECT datname FROM pg_database WHERE datname = $1 OR datname LIKE $2`,
    [TEMPLATE_DB, `${WORKER_DB_PREFIX}%`],
  );
  for (const { datname } of rows) {
    // eslint-disable-next-line no-await-in-loop
    await client.query(`DROP DATABASE IF EXISTS "${datname}" WITH (FORCE)`);
  }
}

function sourceFingerprint(): string {
  const hash = createHash("sha256");
  const roots = ["src", "vite.config.ts", "package.json", "tracer.ts"];
  const walk = (path: string): void => {
    const stat = statSync(path, { throwIfNoEntry: false });
    if (!stat) return;
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path)) {
        walk(join(path, entry));
      }
      return;
    }
    hash.update(path);
    hash.update(String(stat.size));
    hash.update(String(Math.trunc(stat.mtimeMs)));
  };
  for (const root of roots) {
    walk(resolve(process.cwd(), root));
  }
  // The lockfile lives at the repo root.
  const lock = resolve(process.cwd(), "../../bun.lock");
  const lockStat = statSync(lock, { throwIfNoEntry: false });
  if (lockStat) hash.update(String(lockStat.mtimeMs));
  return hash.digest("hex");
}

function buildIfStale(): void {
  const fingerprint = sourceFingerprint();
  const built =
    existsSync(SERVER_ENTRY) &&
    existsSync(BUILD_HASH_FILE) &&
    readFileSync(BUILD_HASH_FILE, "utf8") === fingerprint;
  if (built) {
    console.log("[e2e] build up to date, skipping");
    return;
  }

  console.log("[e2e] building app (.output)...");
  // Build in production mode, exactly as the Dockerfile does. Building under the
  // inherited NODE_ENV=test breaks Rolldown's resolution of shiki's onig.wasm;
  // the test-specific runtime env is supplied when the built server is spawned,
  // not at build time.
  const result = spawnSync("bun", ["run", "build:container"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });
  if (result.status !== 0) {
    throw new Error(`vite build failed with code ${result.status}`);
  }
  writeFileSync(BUILD_HASH_FILE, fingerprint);
}

async function seedRoster(db: Kysely<Database>, now: Date): Promise<void> {
  const passwordHash = await hashPassword(ROSTER_PASSWORD);
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await db
    .insertInto("teams")
    .values({
      id: E2E_TEAM_ID,
      branch_id: INFINITY_BRANCH_ID,
      name: "E2E Team",
      created_at: now,
    })
    .execute();

  for (const user of ROSTER) {
    if (!isValidTokenFormat(user.token)) {
      throw new Error(`roster token for '${user.key}' is not a valid format`);
    }

    // eslint-disable-next-line no-await-in-loop
    await db
      .insertInto("users")
      .values({
        id: UserId.trust(user.userId),
        branch_id: INFINITY_BRANCH_ID,
        team_id: user.role === "executive" ? E2E_TEAM_ID : null,
        username: user.username,
        email: user.email,
        password_hash: passwordHash,
        names: "E2E",
        first_surname: user.role,
        second_surname: "User",
        onboarding_completed_at: now,
        role: user.role,
        is_active: true,
        created_at: now,
      })
      .execute();

    // eslint-disable-next-line no-await-in-loop
    await db
      .insertInto("user_sessions")
      .values({
        id: hashSessionToken(user.token),
        user_id: UserId.trust(user.userId),
        branch_id: INFINITY_BRANCH_ID,
        role: user.role,
        session_class: "app",
        primary_auth_method: "password",
        strong_auth_method: null,
        strong_auth_at: null,
        impersonator_user_id: null,
        ip_address: "127.0.0.1",
        user_agent: "e2e",
        created_at: now,
        last_activity: now,
        expires_at: expiresAt,
      })
      .execute();
  }
}

async function tableNames(db: Kysely<Database>): Promise<string[]> {
  const { rows } = await sql<{ tablename: string }>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `.execute(db);
  return rows.map((r) => r.tablename);
}

async function nonEmptyTables(
  db: Kysely<Database>,
  tables: string[],
): Promise<Set<string>> {
  const nonEmpty = new Set<string>();
  for (const table of tables) {
    // eslint-disable-next-line no-await-in-loop
    const { rows } = await sql<{ present: number }>`
      SELECT 1 AS present FROM ${sql.table(table)} LIMIT 1
    `.execute(db);
    if (rows.length > 0) nonEmpty.add(table);
  }
  return nonEmpty;
}

// regclass renders schema-qualified names only when ambiguous; strip a public
// prefix and quotes so they match pg_tables.tablename.
function cleanRegclass(name: string): string {
  return name.replace(/^public\./, "").replace(/"/g, "");
}

async function foreignKeyEdges(
  db: Kysely<Database>,
): Promise<Array<{ child: string; parent: string }>> {
  const { rows } = await sql<{ child: string; parent: string }>`
    SELECT con.conrelid::regclass::text AS child,
           con.confrelid::regclass::text AS parent
    FROM pg_constraint con
    WHERE con.contype = 'f' AND con.connamespace = 'public'::regnamespace
  `.execute(db);
  return rows.map((r) => ({
    child: cleanRegclass(r.child),
    parent: cleanRegclass(r.parent),
  }));
}

// The preserved identity tables a test legitimately appends to: invite
// acceptance creates users, activation creates sessions, and teams is preserved
// because users references it. The reset prunes these back to their baseline
// rows. Every other preserved table is a guard table, expected never to change.
const MANAGED_IDENTITY_TABLES = ["user_sessions", "users", "teams"] as const;
type ManagedIdentityTable = (typeof MANAGED_IDENTITY_TABLES)[number];

// A `DELETE` that keeps only the seeded baseline rows for a preserved identity
// table, or clears it when the baseline is empty.
function deleteNonBaseline(table: string, ids: string[]): string {
  if (!ids.length) return `DELETE FROM "${table}"`;
  const literals = ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(", ");
  return `DELETE FROM "${table}" WHERE id::text NOT IN (${literals})`;
}

// Between tests a worker database is reset to the pristine template state:
// TRUNCATE every table a test can dirty, then delete rows a test appended to the
// managed identity tables. The preserve set starts as the seeded (non-empty)
// tables and is closed under "referenced by a preserved table": if a preserved
// table has a foreign key into an empty table (e.g. users -> teams), that table
// must also be preserved, otherwise TRUNCATE ... CASCADE would cascade back and
// wipe the preserved table. Preserved tables outside the managed set become
// guard counts (asserted static on the next reset).
async function computeResetPlan(db: Kysely<Database>): Promise<ResetPlan> {
  const tables = await tableNames(db);
  const preserve = await nonEmptyTables(db, tables);
  const edges = await foreignKeyEdges(db);

  let changed = true;
  while (changed) {
    changed = false;
    for (const { child, parent } of edges) {
      if (preserve.has(child) && !preserve.has(parent)) {
        preserve.add(parent);
        changed = true;
      }
    }
  }

  const truncateTargets = tables.filter((t) => !preserve.has(t));
  const truncateSql = truncateTargets.length
    ? `TRUNCATE TABLE ${truncateTargets
        .map((t) => `"${t}"`)
        .join(", ")} RESTART IDENTITY CASCADE`
    : null;

  // Delete anything not in the seeded baseline, ordered by foreign-key
  // dependency (sessions before users before teams).
  const baseline = async (table: ManagedIdentityTable) => {
    const { rows } = await sql<{ id: string }>`
      SELECT id::text AS id FROM ${sql.table(table)}
    `.execute(db);
    return rows.map((r) => r.id);
  };

  const deleteSql: string[] = [];
  for (const table of MANAGED_IDENTITY_TABLES) {
    // eslint-disable-next-line no-await-in-loop
    deleteSql.push(deleteNonBaseline(table, await baseline(table)));
  }

  const managed = new Set<string>(MANAGED_IDENTITY_TABLES);
  const guardCounts: GuardCount[] = [];
  for (const table of preserve) {
    if (managed.has(table)) continue;
    // eslint-disable-next-line no-await-in-loop
    const { rows } = await sql<{ n: number }>`
      SELECT count(*)::int AS n FROM ${sql.table(table)}
    `.execute(db);
    guardCounts.push({ table, count: rows[0]?.n ?? 0 });
  }

  return { truncateSql, deleteSql, guardCounts };
}

async function buildTemplate(): Promise<ResetPlan> {
  await withMaintenance(async (client) => {
    await dropStaleDatabases(client);
    await client.query(`CREATE DATABASE "${TEMPLATE_DB}"`);
  });

  const db = createDb(withDatabase(baseUrl(), TEMPLATE_DB));
  try {
    await migrateToLatest(db);
    const context = createSeedContext();
    await provisionInstallation(db, context.anchorDate);
    await seedRoster(db, context.anchorDate);
    return await computeResetPlan(db);
  } finally {
    // Postgres refuses to clone a template with live connections.
    await db.destroy();
  }
}

async function main(): Promise<void> {
  buildIfStale();
  const reset = await buildTemplate();

  const manifest: E2EManifest = {
    maintenanceUrl: withDatabase(baseUrl(), "postgres"),
    templateDb: TEMPLATE_DB,
    serverEntry: SERVER_ENTRY,
    reset,
  };
  writeManifest(manifest);
  console.log(`[e2e] template ready: ${TEMPLATE_DB}`);
}

await main();
