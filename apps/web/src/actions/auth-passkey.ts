"use server";

import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { getRequestEvent } from "solid-js/web";

import type { Role } from "~/lib/auth/access/rbac";

import {
  beginPasskeyLoginFlow,
  finishPasskeyLoginFlow,
} from "~/lib/auth/passkey/login-flow";
import { createPasskeyService } from "~/lib/auth/passkey/passkey";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { getSessionCookie, setSessionCookie } from "~/lib/auth/session/cookies";
import {
  createSession,
  invalidateSession,
} from "~/lib/auth/session/session-manager";
import { hashSessionToken } from "~/lib/auth/session/tokens";
import { repos } from "~/server/shared/context";

export interface PasskeyChallengeResult {
  challengeId: number;
  options: Awaited<
    ReturnType<
      ReturnType<typeof createPasskeyService>["getAuthenticationOptions"]
    >
  >;
}

export interface PasskeyLoginResult {
  userId: number;
  role: Role;
}

export async function beginPasskeyLogin(
  email: string,
): Promise<PasskeyChallengeResult> {
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  return beginPasskeyLoginFlow(
    email,
    ipAddress,
    repos,
    createPasskeyService(repos),
  );
}

export async function finishPasskeyLogin(
  challengeId: number,
  response: AuthenticationResponseJSON,
): Promise<PasskeyLoginResult> {
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  const userAgent = event?.request.headers.get("user-agent") ?? null;
  const flowResult = await finishPasskeyLoginFlow(
    challengeId,
    response,
    ipAddress,
    repos,
    createPasskeyService(repos),
  );
  const user = await repos.users.findById(flowResult.userId);
  if (!user) throw new Error("Invalid credentials");

  const oldToken = getSessionCookie();
  if (oldToken) {
    const oldSessionId = hashSessionToken(oldToken);
    await invalidateSession(oldSessionId).catch(() => {});
  }

  const token = await createSession(
    user.id,
    user.branch_id,
    user.role,
    ipAddress,
    userAgent,
  );
  setSessionCookie(token);

  await repos.auditLogs.create({
    user_id: user.id,
    action: "login_passkey",
    entity_type: "user",
    entity_id: user.id,
    changes: null,
    created_at: Date.now(),
  });

  return { userId: user.id, role: user.role };
}
