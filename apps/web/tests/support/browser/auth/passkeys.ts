import type { PasskeyLoginFlowState } from "~/lib/auth/passkey/types";
import { startPasskeyLogin } from "~/server/auth/flows/start-passkey-login";
import { createAuthLoginContext } from "~/server/auth/infrastructure/login-context";
import { isErr } from "~/server/shared/result";

import { createTestPasskeyProvider } from "../../passkey/api";
import type { BrowserDbRuntime } from "../runtime";
import type { BrowserIdentity } from "./types";

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
    created_at: new Date(),
  });
}

export async function createPasskeyFlow(
  runtime: BrowserDbRuntime,
  identity: BrowserIdentity,
): Promise<PasskeyLoginFlowState> {
  await ensurePasskey(runtime, identity);
  const login = createAuthLoginContext(runtime.db);
  const result = await startPasskeyLogin(
    {
      identifier: identity.username,
      ipAddress: "127.0.0.1",
      mode: "identified",
    },
    login,
    createTestPasskeyProvider(login.repos),
  );

  if (isErr(result)) {
    throw new Error(`Could not create passkey flow for ${identity.username}`);
  }

  return result.value;
}
