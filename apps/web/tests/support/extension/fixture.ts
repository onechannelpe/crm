import { generateKeyPairSync } from "node:crypto";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { vi } from "vitest";

// Call once, in `beforeAll`: creates the file-scoped isolated database and
// stubs the handoff keypair env vars for the whole file's run.
export async function createExtensionFixture(
  prefix: string,
): Promise<TestDbContext> {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  vi.stubEnv(
    "EXTENSION_HANDOFF_PRIVATE_KEY_PKCS8_BASE64",
    Buffer.from(privateKey.export({ format: "der", type: "pkcs8" })).toString(
      "base64",
    ),
  );
  vi.stubEnv(
    "EXTENSION_HANDOFF_PUBLIC_KEY_SPKI_BASE64",
    Buffer.from(publicKey.export({ format: "der", type: "spki" })).toString(
      "base64",
    ),
  );
  vi.stubEnv("EXTENSION_EXPECTED_ORIGIN", "http://localhost:3000");
  return createIsolatedTestDb(prefix);
}

// Call in `beforeEach`: restores the database to its seeded baseline.
export async function resetExtensionFixture(ctx: TestDbContext): Promise<void> {
  await resetTestDb(ctx);
}

// Call once, in `afterAll`: drops the file-scoped database.
export async function disposeExtensionFixture(
  ctx: TestDbContext,
): Promise<void> {
  await cleanupTestDb(ctx);
}
