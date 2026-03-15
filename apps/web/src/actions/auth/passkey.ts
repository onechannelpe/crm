"use server";

import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { getRequestEvent } from "solid-js/web";

import { internalError } from "~/lib/app-errors";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { recordAuthAnalyticsEvent } from "~/lib/auth/auth-analytics";
import {
  createPasskeyAuthService,
  type FinishPasskeyLoginError,
} from "~/lib/auth/passkey/service";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { replaceCurrentSession } from "~/lib/auth/session/session-issuer";
import { getActionRequestContext } from "~/lib/observability/context";
import { privilegedLoginAlertSender, repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

function normalizePasskeyLoginError(error: FinishPasskeyLoginError): {
  ok: false;
  code: "flow_expired" | "invalid_credentials";
} {
  if (error.kind === "unexpected") {
    throw internalError(error.message);
  }

  return {
    ok: false,
    code: error.kind,
  };
}

function resolvePasskeyAnalyticsCode(
  error: FinishPasskeyLoginError,
): "flow_expired" | "invalid_credentials" | "internal" {
  return error.kind === "unexpected" ? "internal" : error.kind;
}

export async function finishPasskeyLogin(
  flowId: number,
  response: AuthenticationResponseJSON,
) {
  const event = getRequestEvent();
  const service = createPasskeyAuthService(repos);
  const result = await service.finishLogin({
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
        code: resolvePasskeyAnalyticsCode(result.error),
      },
      getActionRequestContext(),
    );
    return normalizePasskeyLoginError(result.error);
  }

  await recordAuthAnalyticsEvent(
    {
      source: "server",
      kind: "passkey_result",
      outcome: "succeeded",
    },
    getActionRequestContext(),
  );
  await replaceCurrentSession(result.value.token);
  return {
    ok: true as const,
    redirectTo: result.value.onboardingCompleted
      ? getDefaultAppPath(result.value.role)
      : "/onboarding",
  };
}
