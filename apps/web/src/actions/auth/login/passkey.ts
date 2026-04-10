"use server";

import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { internalError } from "~/lib/app-errors";
import { recordAuthAnalyticsEvent } from "~/lib/auth/auth-analytics";
import type { FinishPasskeyLoginError } from "~/lib/auth/passkey/service";
import { getRequestClientMetadata } from "~/lib/http/request-context";
import { getActionRequestContext } from "~/lib/observability/context";
import { createRequestPasskeyProviderFactory } from "~/server/auth/infrastructure/request-passkey-provider";
import { finishPasskeyLogin as finishPasskeyLoginService } from "~/server/auth/application/login/passkey";
import { replaceCurrentSessionAndResolveRedirect } from "~/server/auth/application/login/session-redirect";
import { serverRuntime } from "~/server/runtime";
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
  const loginContext = serverRuntime.auth.login;
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
  return {
    ok: true,
    redirectTo: await replaceCurrentSessionAndResolveRedirect({
      token: result.value.token,
      onboardingCompleted: result.value.onboardingCompleted,
      role: result.value.role,
    }),
  };
}
