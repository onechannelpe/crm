import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// prepare.ts (Bun) freezes every fact the Node test side needs about the
// provisioned world into this file: the template to clone, the built server to
// run, and the SQL that resets a worker database between tests. The Node side
// never imports application code, so all app knowledge is precomputed here and
// consumed as plain data.
export const MANIFEST_PATH = resolve(process.cwd(), ".e2e-manifest.json");

export interface ResetPlan {
  // One `TRUNCATE a, b, ... RESTART IDENTITY CASCADE` over every table empty in
  // the pristine template (the domain tables a test dirties). Null when there
  // are none.
  truncateSql: string | null;
  // Ordered statements that drop rows a test appended to preserved tables
  // (new users and their sessions), leaving only the baseline roster.
  deleteSql: string[];
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
