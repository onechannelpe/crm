import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// prepare.ts freezes every fact the test side needs about the provisioned world
// into this file: the template to clone, the built server to run, and the plan
// that resets a worker database between tests. Playwright gives global setup no
// in-memory channel to its worker processes, so all app knowledge computed once
// at setup is precomputed here and consumed by workers as plain data.
export const MANIFEST_PATH = resolve(process.cwd(), ".e2e-manifest.json");

// A preserved table (seeded non-empty, so never truncated) that no spec is meant
// to write to, paired with its seeded row count. The reset asserts the count
// still holds; a mismatch means a test leaked rows into a table the reset does
// not prune.
export interface GuardCount {
  table: string;
  count: number;
}

export interface ResetPlan {
  // One `TRUNCATE a, b, ... RESTART IDENTITY CASCADE` over every table empty in
  // the pristine template (the domain tables a test dirties). Null when there
  // are none.
  truncateSql: string | null;
  // Ordered statements that drop rows a test appended to the preserved identity
  // tables (new users and their sessions), leaving only the baseline roster.
  deleteSql: string[];
  // Preserved tables the reset does not prune, with their seeded counts. The
  // reset fails loudly if any grew, catching a test that wrote where it must not.
  guardCounts: GuardCount[];
}

export interface E2EManifest {
  // Maintenance connection (…/postgres) used to CREATE/DROP worker databases.
  maintenanceUrl: string;
  templateDb: string;
  // Absolute path to the built server entry (.output/server/index.mjs).
  serverEntry: string;
  reset: ResetPlan;
}

export function writeManifest(manifest: E2EManifest): void {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

export function readManifest(): E2EManifest {
  try {
    const manifest: E2EManifest = JSON.parse(
      readFileSync(MANIFEST_PATH, "utf8"),
    );
    return manifest;
  } catch (error) {
    throw new Error(
      `could not read ${MANIFEST_PATH}; run e2e tests via 'bun run test:e2e' so ` +
        "globalSetup provisions the template and writes the manifest first",
      { cause: error },
    );
  }
}
