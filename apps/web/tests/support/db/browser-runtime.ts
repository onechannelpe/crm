import { resolve } from "node:path";

import type { Kysely } from "kysely";

import { createDb } from "../../../src/lib/db/client";
import type { Database } from "../../../src/lib/db/types";
import {
  createRepositories,
  type Repositories,
} from "../../../src/server/shared/registry";

export interface BrowserDbRuntime {
  db: Kysely<Database>;
  dbPath: string;
  repos: Repositories;
}

const TEST_DB_DIR = resolve(process.cwd(), ".playwright-db");

export function resolveBrowserDbPathForProject(projectName: string): string {
  return resolve(TEST_DB_DIR, `${projectName}.db`);
}

export function createBrowserDbRuntime(dbPath: string): BrowserDbRuntime {
  const db = createDb(dbPath);

  return {
    db,
    dbPath,
    repos: createRepositories(db),
  };
}

export async function disposeBrowserDbRuntime(
  runtime: BrowserDbRuntime,
): Promise<void> {
  await runtime.db.destroy();
}
