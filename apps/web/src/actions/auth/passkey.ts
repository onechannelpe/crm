"use server";

import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { getRequestEvent } from "solid-js/web";

import { forbiddenError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import {
  beginPasskeyLoginFlow,
  finishPasskeyLoginFlow,
} from "~/lib/auth/passkey/login-flow";
import { createPasskeyService } from "~/lib/auth/passkey/passkey";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { createPrivilegedLoginAlertSender } from "~/lib/auth/security/login-alerts";
import {
  issueLoginSession,
  replaceCurrentSession,
} from "~/lib/auth/session/login-completion";
import { env } from "~/lib/env";
import { repos } from "~/server/shared/context";

const sendPrivilegedLoginAlert = createPrivilegedLoginAlertSender(repos, {
  resendApiKey: env.resendApiKey || undefined,
  fromEmail: env.emailFrom || undefined,
  whatsappAccessToken: env.whatsappAccessToken || undefined,
  whatsappPhoneNumberId: env.whatsappPhoneNumberId || undefined,
  whatsappApiVersion: env.whatsappApiVersion || undefined,
});

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
  onboardingCompleted: boolean;
}

export async function completePasskeyLoginSession(
  userId: number,
  ipAddress: string,
  userAgent: string | null,
): Promise<PasskeyLoginResult> {
  const user = await repos.users.findById(userId);
  if (!user) throw forbiddenError("Invalid credentials");

  const session = await issueLoginSession({
    user,
    ipAddress,
    userAgent,
    authMethod: "passkey",
    strongAuthAt: Date.now(),
    auditAction: "login_passkey",
    deps: repos,
  });
  await replaceCurrentSession(session.token);

  return {
    userId: session.userId,
    role: session.role,
    onboardingCompleted: session.onboardingCompleted,
  };
}

export async function beginPasskeyLogin(
  username: string,
): Promise<PasskeyChallengeResult> {
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  return beginPasskeyLoginFlow(
    username,
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
    sendPrivilegedLoginAlert,
  );
  return completePasskeyLoginSession(flowResult.userId, ipAddress, userAgent);
}
