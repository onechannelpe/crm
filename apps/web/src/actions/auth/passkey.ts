"use server";

import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { getRequestEvent } from "solid-js/web";

import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { submitPasskeyForLoginFlow } from "~/lib/auth/login-flow";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { createPrivilegedLoginAlertSender } from "~/lib/auth/security/login-alerts";
import { replaceCurrentSession } from "~/lib/auth/session/login-completion";
import { env } from "~/lib/env";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

const sendPrivilegedLoginAlert = createPrivilegedLoginAlertSender(repos, {
  resendApiKey: env.resendApiKey || undefined,
  fromEmail: env.emailFrom || undefined,
  whatsappAccessToken: env.whatsappAccessToken || undefined,
  whatsappPhoneNumberId: env.whatsappPhoneNumberId || undefined,
  whatsappApiVersion: env.whatsappApiVersion || undefined,
});

export async function finishPasskeyLogin(
  flowId: number,
  response: AuthenticationResponseJSON,
) {
  const event = getRequestEvent();
  const result = await submitPasskeyForLoginFlow(
    {
      flowId,
      response,
      ipAddress: getClientIp(event?.request.headers ?? new Headers()),
      userAgent: event?.request.headers.get("user-agent") ?? null,
    },
    repos,
    sendPrivilegedLoginAlert,
  );

  if (isErr(result)) {
    return {
      ok: false as const,
      code: result.error.kind,
      message:
        result.error.kind === "flow_expired"
          ? "La sesión de clave de acceso expiró. Intenta de nuevo."
          : "No se pudo iniciar sesión con la clave de acceso",
    };
  }

  await replaceCurrentSession(result.value.result.token);
  return {
    ok: true as const,
    redirectTo: result.value.result.onboardingCompleted
      ? getDefaultAppPath(result.value.result.role)
      : "/onboarding",
  };
}
