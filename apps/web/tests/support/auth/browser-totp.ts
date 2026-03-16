import { encryptTotpSecret } from "../../../src/lib/auth/totp/secret-crypto";
import { generateTotpSecret } from "../../../src/lib/auth/totp/totp";
import type { BrowserDbRuntime } from "../db/browser-runtime";
import type { BrowserIdentity } from "./browser-types";

export async function ensureTotp(
  runtime: BrowserDbRuntime,
  identity: BrowserIdentity,
): Promise<void> {
  const existing = await runtime.repos.userTotpFactors.findByUserId(
    identity.userId,
  );
  if (existing?.is_enabled === 1) {
    return;
  }

  await runtime.repos.userTotpFactors.createOrRotate(
    identity.userId,
    await encryptTotpSecret(generateTotpSecret()),
  );
  await runtime.repos.userTotpFactors.markEnabled(identity.userId);
}
