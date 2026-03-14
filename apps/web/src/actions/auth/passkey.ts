"use server";

import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { getRequestEvent } from "solid-js/web";

import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { recordAuthAnalyticsEvent } from "~/lib/auth/auth-analytics";
import { createPasskeyLoginWorkflowService } from "~/lib/auth/passkey/workflows";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { replaceCurrentSession } from "~/lib/auth/session/login-completion";
import { getActionRequestContext } from "~/lib/observability/context";
import { privilegedLoginAlertSender, repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

export async function finishPasskeyLogin(
  flowId: number,
  response: AuthenticationResponseJSON,
) {
  const event = getRequestEvent();
  const workflow = createPasskeyLoginWorkflowService(repos);
  const result = await workflow.finishLogin({
    flowId,
    response,
    ipAddress: getClientIp(event?.request.headers ?? new Headers()),
    userAgent: event?.request.headers.get("user-agent") ?? null,
    sendPrivilegedLoginAlert: privilegedLoginAlertSender,
  });

  if (isErr(result)) {
    await recordAuthAnalyticsEvent(
      {
        source: "server",
        kind: "passkey_result",
        outcome: "failed",
        code: result.error.kind,
      },
      getActionRequestContext(),
    );
    return {
      ok: false as const,
      code: result.error.kind,
    };
  }

  await recordAuthAnalyticsEvent(
    {
      source: "server",
      kind: "passkey_result",
      outcome: "succeeded",
    },
    getActionRequestContext(),
  );
  await replaceCurrentSession(result.value.result.token);
  return {
    ok: true as const,
    redirectTo: result.value.result.onboardingCompleted
      ? getDefaultAppPath(result.value.result.role)
      : "/onboarding",
  };
}
