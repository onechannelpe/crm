import { createPasskeyAuthService } from "../../../src/lib/auth/passkey/service";
import type { PasskeyLoginFlowState } from "../../../src/lib/auth/passkey/service";
import { isErr } from "../../../src/server/shared/result";
import type { BrowserDbRuntime } from "../db/browser-runtime";
import type { BrowserIdentity } from "./browser-types";

export async function ensurePasskey(
  runtime: BrowserDbRuntime,
  identity: BrowserIdentity,
): Promise<void> {
  const existing = await runtime.repos.passkeys.findByUser(identity.userId);
  if (existing.length > 0) {
    return;
  }

  await runtime.repos.passkeys.create({
    id: `pw-passkey-${identity.userId}`,
    user_id: identity.userId,
    public_key: Buffer.from(`browser-passkey-${identity.userId}`).toString(
      "base64",
    ),
    counter: 0,
    transports: JSON.stringify(["internal"]),
  });
}

export async function createPasskeyFlow(
  runtime: BrowserDbRuntime,
  identity: BrowserIdentity,
): Promise<PasskeyLoginFlowState> {
  await ensurePasskey(runtime, identity);
  const result = await createPasskeyAuthService(runtime.repos).beginLogin({
    identifier: identity.username,
    ipAddress: "127.0.0.1",
  });

  if (isErr(result)) {
    throw new Error(`Could not create passkey flow for ${identity.username}`);
  }

  return result.value;
}
