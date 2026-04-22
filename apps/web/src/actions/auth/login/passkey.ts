"use server";

import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { internalError } from "~/lib/app-errors";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { recordAuthAnalyticsEvent } from "~/lib/auth/auth-analytics";
import { replaceCurrentSession } from "~/lib/auth/session/session-transition";
import { getRequestClientMetadata } from "~/lib/http/request-context";
import { getActionRequestContext } from "~/lib/observability/context";
import { finishPasskeyLogin as finishPasskeyLoginService } from "~/server/auth/application/commands/finish-passkey-login";
import { createRequestPasskeyProviderFactory } from "~/server/auth/infrastructure/request-passkey-provider";
import type { FinishPasskeyLoginError } from "~/server/auth/passkey/service";
import { getServerRuntime } from "~/server/runtime";
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
): Promise<
  | {
      ok: false;
      code: "flow_expired" | "invalid_credentials";
    }
  | {
      ok: true;
      redirectTo: string;
    }
> {
  const request = getRequestClientMetadata();
  const loginContext = getServerRuntime().auth.login;
  const result = await finishPasskeyLoginService(
    {
      repos: loginContext.repos,
      sendPrivilegedLoginAlert: loginContext.privilegedLoginAlertSender,
    },
    {
      flowId,
      response,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      createWebauthnProvider: createRequestPasskeyProviderFactory(),
    },
  );

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
  await replaceCurrentSession(result.value.token, (sessionId) =>
    getServerRuntime().auth.sessionService.invalidateSession(sessionId),
  );
  return {
    ok: true,
    redirectTo: result.value.onboardingCompleted
      ? getDefaultAppPath(result.value.role)
      : "/onboarding",
  };
}
