import { Client } from "pg";

import type { GuardCount, ResetPlan } from "./manifest";

// Raw-SQL Postgres helpers for the test side. Cloning, dropping, resetting, and
// reading a worker database needs no application code, so this stays on `pg`
// alone and the worker fixtures pull in nothing from the app.

const SAFE_DB_NAME = /^[a-z0-9_]+$/;

function assertSafeDbName(name: string): void {
  if (!SAFE_DB_NAME.test(name)) {
    throw new Error(`unsafe database name: ${name}`);
  }
}

export function withDatabase(url: string, name: string): string {
  const next = new URL(url);
  next.pathname = `/${name}`;
  return next.toString();
}

async function withClient<T>(
  url: string,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// Cloning a seeded template needs no application code, so it is the per-worker
// isolation primitive: every worker gets a byte-identical copy of the pristine
// world.
export async function cloneTemplate(
  maintenanceUrl: string,
  template: string,
  target: string,
): Promise<void> {
  assertSafeDbName(template);
  assertSafeDbName(target);
  await withClient(maintenanceUrl, async (client) => {
    await client.query(`CREATE DATABASE "${target}" TEMPLATE "${template}"`);
  });
}

export async function dropDatabase(
  maintenanceUrl: string,
  target: string,
): Promise<void> {
  assertSafeDbName(target);
  await withClient(maintenanceUrl, async (client) => {
    await client.query(`DROP DATABASE IF EXISTS "${target}" WITH (FORCE)`);
  });
}

// A long-lived connection to a worker's own database, used to reset it to the
// pristine template between tests and assert preserved tables stayed intact.
export class WorkerDb {
  private constructor(readonly client: Client) {}

  static async open(url: string): Promise<WorkerDb> {
    const client = new Client({ connectionString: url });
    await client.connect();
    return new WorkerDb(client);
  }

  async reset(plan: ResetPlan): Promise<void> {
    // Runs before each test, so it validates the residue of the previous one.
    // Detection lags by a test, which still fails the run.
    await this.assertPreservedTablesUnchanged(plan.guardCounts);

    if (plan.truncateSql) {
      await this.client.query(plan.truncateSql);
    }
    for (const statement of plan.deleteSql) {
      // Ordered by foreign-key dependency; run sequentially, not in parallel.
      // eslint-disable-next-line no-await-in-loop
      await this.client.query(statement);
    }
  }

  // Preserved tables the reset does not prune must still hold exactly their
  // seeded rows. If one grew, a prior test wrote to a table the reset cannot
  // clean, which would bleed into later tests (and, for tables referencing
  // users, break the users delete). Fail loudly, naming the table.
  private async assertPreservedTablesUnchanged(
    guards: GuardCount[],
  ): Promise<void> {
    for (const guard of guards) {
      const { rows } = await this.client.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM "${guard.table}"`,
      );
      const actual = rows[0]?.n ?? 0;
      if (actual !== guard.count) {
        throw new Error(
          `e2e reset guard: "${guard.table}" holds ${actual} rows, expected the seeded ${guard.count}. ` +
            "A test wrote to a preserved table the reset does not prune; stop writing to it or add it to the reset's pruned set.",
        );
      }
    }
  }

  async close(): Promise<void> {
    await this.client.end();
  }
}
