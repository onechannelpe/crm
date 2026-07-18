import { Client } from "pg";

import type { ResetPlan } from "./manifest";

// Raw-SQL Postgres helpers for the Node test side. Deliberately depends only on
// `pg`: cloning, dropping, and resetting databases needs no application code, so
// the Playwright runner never imports Bun-only builtins.

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

// A long-lived connection to a worker's own database, used to reset it between
// tests and to read domain rows a spec needs (e.g. an invite token the UI never
// surfaces).
export class WorkerDb {
  private constructor(readonly client: Client) {}

  static async open(url: string): Promise<WorkerDb> {
    const client = new Client({ connectionString: url });
    await client.connect();
    return new WorkerDb(client);
  }

  async reset(plan: ResetPlan): Promise<void> {
    if (plan.truncateSql) {
      await this.client.query(plan.truncateSql);
    }
    for (const statement of plan.deleteSql) {
      // Ordered by foreign-key dependency; run sequentially, not in parallel.
      // eslint-disable-next-line no-await-in-loop
      await this.client.query(statement);
    }
  }

  async close(): Promise<void> {
    await this.client.end();
  }
}
