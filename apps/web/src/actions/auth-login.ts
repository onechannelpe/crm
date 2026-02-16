"use server";

import { getSessionCookie, setSessionCookie } from "~/lib/auth/cookies";
import { invalidateSession } from "~/lib/auth/session-manager";
import type { Role } from "~/lib/auth/rbac";
import { hashSessionToken } from "~/lib/auth/tokens";
import { getRequestEvent } from "solid-js/web";
import { getClientIp } from "~/lib/auth/client-ip";
import { authenticatePasswordLogin } from "~/lib/auth/password-login";

export interface LoginResult {
  userId: number;
  role: Role;
}

export async function login(
  email: string,
  password: string,
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
    ipAddress,
    userAgent,
  });
  setSessionCookie(result.token);

  return { userId: result.userId, role: result.role };
}
