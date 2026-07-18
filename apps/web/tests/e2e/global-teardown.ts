import { Client } from "pg";

import { readManifest } from "./manifest";

// Drops the template and any leftover worker databases after the run. Workers
// drop their own databases on teardown; this sweeps up anything a crashed worker
// left behind so the Postgres server stays clean between runs.
export default async function globalTeardown(): Promise<void> {
  let manifest;
  try {
    manifest = readManifest();
  } catch {
    return; // provisioning never completed; nothing to clean.
  }

  const client = new Client({ connectionString: manifest.maintenanceUrl });
  await client.connect();
  try {
    const { rows } = await client.query<{ datname: string }>(
      `SELECT datname FROM pg_database WHERE datname = $1 OR datname LIKE 'crm_e2e_w%'`,
      [manifest.templateDb],
    );
    for (const { datname } of rows) {
      // eslint-disable-next-line no-await-in-loop
      await client.query(`DROP DATABASE IF EXISTS "${datname}" WITH (FORCE)`);
    }
  } finally {
    await client.end();
  }
}
