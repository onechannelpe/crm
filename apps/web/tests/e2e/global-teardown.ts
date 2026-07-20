import { Client } from "pg";

import { readManifest } from "./manifest";

export default async function globalTeardown(): Promise<void> {
  let manifest;

  try {
    manifest = readManifest();
  } catch {
    // Setup did not complete, so there is nothing to clean up.
    return;
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
