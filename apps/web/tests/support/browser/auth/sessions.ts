import type { Page } from "@playwright/test";

import type { SessionClass } from "~/lib/auth/core/session-contract";
import {
  generateSessionToken,
  hashSessionToken,
} from "~/lib/auth/session/tokens";

import type { BrowserDbRuntime } from "../runtime";
import type { BrowserIdentity } from "./types";

export async function seedBrowserSession(
  runtime: BrowserDbRuntime,
  identity: BrowserIdentity,
  options?: {
    sessionClass?: SessionClass;
    primaryAuthMethod?: "password" | "google" | "passkey";
    strongAuthMethod?: "totp" | "passkey" | "federated" | null;
    strongAuthAt?: Date | null;
  },
): Promise<string> {
  const token = generateSessionToken();
  const now = new Date();

  await runtime.repos.sessions.create({
    id: hashSessionToken(token),
    user_id: identity.userId,
    branch_id: identity.branchId,
    role: identity.role,
    session_class: options?.sessionClass ?? "app",
    primary_auth_method: options?.primaryAuthMethod ?? "password",
    strong_auth_method: options?.strongAuthMethod ?? null,
    strong_auth_at: options?.strongAuthAt ?? null,
    ip_address: "127.0.0.1",
    user_agent: "playwright",
    created_at: now,
    last_activity: now,
    expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
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
