import { Client } from "pg";

import type { GuardCount, ResetPlan } from "./manifest";

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

// Keeps one connection open for resets and guard checks.
export class WorkerDb {
  private constructor(readonly client: Client) {}

  static async open(url: string): Promise<WorkerDb> {
    const client = new Client({ connectionString: url });

    await client.connect();

    return new WorkerDb(client);
  }

  async reset(plan: ResetPlan): Promise<void> {
    // Checks the previous test's residue before clearing the database.
    await this.assertPreservedTablesUnchanged(plan.guardCounts);

    if (plan.truncateSql) {
      await this.client.query(plan.truncateSql);
    }

    for (const statement of plan.deleteSql) {
      // Foreign-key order requires sequential execution.
      // eslint-disable-next-line no-await-in-loop
      await this.client.query(statement);
    }
  }

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
