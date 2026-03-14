import type { Page } from "@playwright/test";

import {
  generateSessionToken,
  hashSessionToken,
} from "../../../src/lib/auth/session/tokens";
import type { BrowserDbRuntime } from "../db/browser-runtime";
import type { BrowserIdentity } from "./browser-types";

export async function seedBrowserSession(
  runtime: BrowserDbRuntime,
  identity: BrowserIdentity,
  options?: {
    authMethod?: "password" | "password_totp" | "passkey" | "google";
    strongAuthAt?: number | null;
  },
): Promise<string> {
  const token = generateSessionToken();
  const now = Date.now();

  await runtime.repos.sessions.create({
    id: hashSessionToken(token),
    user_id: identity.userId,
    branch_id: identity.branchId,
    role: identity.role,
    auth_method: options?.authMethod ?? "password",
    strong_auth_at: options?.strongAuthAt ?? null,
    ip_address: "127.0.0.1",
    user_agent: "playwright",
    created_at: now,
    last_activity: now,
    expires_at: now + 30 * 24 * 60 * 60 * 1000,
  });

  return token;
}

export async function loginAs(
  page: Page,
  baseURL: string,
  runtime: BrowserDbRuntime,
  identity: BrowserIdentity,
  options?: Parameters<typeof seedBrowserSession>[2],
): Promise<void> {
  const token = await seedBrowserSession(runtime, identity, options);

  await page.context().addCookies([
    {
      name: "session",
      value: token,
      url: baseURL,
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
    },
  ]);
}
