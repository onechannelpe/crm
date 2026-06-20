"use server";

import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { installSession } from "~/actions/auth/install-session";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { recordAuthAnalyticsEvent } from "~/lib/auth/auth-analytics";
import { getRequestClientMetadata } from "~/lib/http/request-context";
import { getActionRequestContext } from "~/lib/observability/context";
import { finishPasskeyLogin as finishPasskeyLoginService } from "~/server/auth/flows/finish-passkey-login";
import { createRequestPasskeyProvider } from "~/server/auth/infrastructure/request-passkey-provider";
import { runPublicAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { fail, throwDomain } from "~/server/shared/domain-error";
import { isErr } from "~/server/shared/result";

export async function finishPasskeyLogin(
  flowId: number,
  response: AuthenticationResponseJSON,
): Promise<{ redirectTo: string }> {
  return runPublicAction(async () => {
    const runtime = getServerRuntime();
    const clientMetadata = getRequestClientMetadata();
    const requestContext = getActionRequestContext();

    const result = await finishPasskeyLoginService(
      {
        repos: runtime.auth.login.repos,
        sendPrivilegedLoginAlert: runtime.auth.login.privilegedLoginAlertSender,
      },
      {
        flowId,
        response,
        ipAddress: clientMetadata.ipAddress,
        userAgent: clientMetadata.userAgent,
        webauthnProvider: createRequestPasskeyProvider(
          runtime.auth.login.repos,
        ),
      },
    );

    if (isErr(result)) {
      await recordAuthAnalyticsEvent(
        {
          source: "server",
          kind: "passkey_result",
          outcome: "failed",
          code: result.error.kind,
        },
        requestContext,
      );

      throwDomain(fail(result.error.kind));
    }

    const session = result.value;

    await recordAuthAnalyticsEvent(
      {
        source: "server",
        kind: "passkey_result",
        outcome: "succeeded",
      },
      requestContext,
    );

    await installSession(session.token);

    return {
      redirectTo: session.onboardingCompleted
        ? getDefaultAppPath(session.role)
        : "/onboarding",
    };
  });
}
