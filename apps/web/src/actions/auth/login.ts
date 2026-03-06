"use server";

import { getRequestEvent } from "solid-js/web";

import type { Role } from "~/lib/auth/access/rbac";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { authenticatePasswordLogin } from "~/lib/auth/password/password-login";
import { createPrivilegedLoginAlertSender } from "~/lib/auth/security/login-alerts";
import { getSessionCookie, setSessionCookie } from "~/lib/auth/session/cookies";
import { invalidateSession } from "~/lib/auth/session/session-manager";
import { hashSessionToken } from "~/lib/auth/session/tokens";
import { env } from "~/lib/env";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { repos } from "~/server/shared/context";

const sendPrivilegedLoginAlert = createPrivilegedLoginAlertSender(repos, {
  resendApiKey: env.resendApiKey || undefined,
  fromEmail: env.emailFrom || undefined,
  whatsappAccessToken: env.whatsappAccessToken || undefined,
  whatsappPhoneNumberId: env.whatsappPhoneNumberId || undefined,
  whatsappApiVersion: env.whatsappApiVersion || undefined,
});

export interface LoginResult {
  userId: number;
  role: Role;
  onboardingCompleted: boolean;
}

export async function login(
  username: string,
  password: string,
  totpCode?: string,
): Promise<LoginResult> {
  return runObservedAction({
    actionName: "auth.login",
    actor: { userId: null, role: null },
    input: { hasTotpCode: Boolean(totpCode) },
    resolveActor: (result) => ({
      userId: result.userId,
      role: result.role,
    }),
    run: async () => {
      const event = getRequestEvent();
      const ipAddress = getClientIp(event?.request.headers ?? new Headers());
      const userAgent = event?.request.headers.get("user-agent") ?? null;

      const oldToken = getSessionCookie();
      if (oldToken) {
        const oldSessionId = hashSessionToken(oldToken);
        await invalidateSession(oldSessionId).catch(() => {});
      }

      const result = await authenticatePasswordLogin(
        {
          username,
          password,
          totpCode,
          ipAddress,
          userAgent,
        },
        { sendPrivilegedLoginAlert },
      ).catch((error: unknown) => {
        if (error instanceof Error && error.message === "Invalid credentials") {
          throw new Response("Invalid credentials", { status: 403 });
        }
        throw error;
      });
      setSessionCookie(result.token);

      return {
        userId: result.userId,
        role: result.role,
        onboardingCompleted: result.onboardingCompleted,
      };
    },
  });
}
