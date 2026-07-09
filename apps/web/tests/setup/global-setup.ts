import { rm } from "node:fs/promises";
import { join } from "node:path";

import { prepareTestDbTemplate } from "@tests/support/runtime/db";
import { acquirePostgresServer } from "@tests/support/runtime/postgres-server";

const ARTIFACT_DIR = join(
  process.cwd(),
  ".vitest-db",
  process.env.TEST_DB_NAMESPACE ?? "default",
  "artifacts",
);

async function removeArtifacts(): Promise<void> {
  try {
    await rm(ARTIFACT_DIR, { recursive: true, force: true });
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

export async function setup() {
  await removeArtifacts();

  const releasePostgresServer = await acquirePostgresServer();
  await prepareTestDbTemplate();

  return async () => {
    await removeArtifacts();
    await releasePostgresServer();
  };
}
