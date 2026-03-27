"use server";

import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { getRequestEvent } from "solid-js/web";

import { internalError } from "~/lib/app-errors";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { recordAuthAnalyticsEvent } from "~/lib/auth/auth-analytics";
import {
  createPasskeyLoginFinishAuthService,
  type FinishPasskeyLoginError,
} from "~/lib/auth/passkey/service";
import {
  createPasskeyProvider,
  resolveWebauthnRelyingParty,
} from "~/lib/auth/providers/passkey-provider";
import { replaceCurrentSession } from "~/lib/auth/session/session-transition";
import { getRequestClientMetadata } from "~/lib/http/request-context";
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
  const event = getRequestEvent();
  const service = createPasskeyLoginFinishAuthService(repos, {
    createWebauthnProvider: (repos) =>
      createPasskeyProvider(repos, resolveWebauthnRelyingParty(event?.request)),
  });
  const request = getRequestClientMetadata();
  const result = await service.finishLogin({
    flowId,
    response,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
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
