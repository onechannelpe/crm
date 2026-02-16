"use server";

import { getRequestEvent } from "solid-js/web";

import type { Role } from "~/lib/auth/access/rbac";

import { getClientIp } from "~/lib/auth/password/client-ip";
import { authenticatePasswordLogin } from "~/lib/auth/password/password-login";
import { getSessionCookie, setSessionCookie } from "~/lib/auth/session/cookies";
import { invalidateSession } from "~/lib/auth/session/session-manager";
import { hashSessionToken } from "~/lib/auth/session/tokens";

export interface LoginResult {
  userId: number;
  role: Role;
}

export async function login(
  email: string,
  password: string,
  totpCode?: string,
): Promise<LoginResult> {
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  const userAgent = event?.request.headers.get("user-agent") ?? null;

  const oldToken = getSessionCookie();
  if (oldToken) {
    const oldSessionId = hashSessionToken(oldToken);
    await invalidateSession(oldSessionId).catch(() => {});
  }

  const result = await authenticatePasswordLogin({
    email,
    password,
    totpCode,
    ipAddress,
    userAgent,
  });
  setSessionCookie(result.token);

  return { userId: result.userId, role: result.role };
}
