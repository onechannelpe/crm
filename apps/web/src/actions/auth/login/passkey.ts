"use server";

import { getSessionPath } from "~/domain/auth/access/route-policy";
import { isAuthenticationResponse } from "~/domain/auth/passkey/credential-response";
import { fail } from "~/domain/errors";
import { AuthLoginFlowId } from "~/domain/ids";
import { recordAuthAnalyticsEvent as recordAuthAnalytics } from "~/server/auth/auth-analytics";
import { verifyPasskeyLogin } from "~/server/auth/factors/passkey/service";
import { completePendingLogin } from "~/server/auth/flows/complete-pending-login";
import { createRequestPasskeyProvider } from "~/server/auth/infrastructure/request-passkey-provider";
import { setSessionCookie } from "~/server/auth/session/cookies";
import { runPublicAction } from "~/server/platform/action";
import { throwDomain } from "~/server/platform/action/domain-error";
import { getServerRuntime } from "~/server/platform/container";
import { getRequestClientMetadata } from "~/server/platform/http/request-context";
import { getActionRequestContext } from "~/server/platform/observability/context";
import { isErr } from "~/shared/result";

function recordAuthAnalyticsEvent(
  event: Parameters<typeof recordAuthAnalytics>[0],
  context: Parameters<typeof recordAuthAnalytics>[1],
) {
  const runtime = getServerRuntime();
  return recordAuthAnalytics(
    event,
    context,
    runtime.auth.analytics,
    runtime.infra.now,
  );
}

export async function finishPasskeyLogin(
  flowId: unknown,
  response: unknown,
): Promise<{ redirectTo: string }> {
  return runPublicAction(async () => {
    const runtime = getServerRuntime();
    const clientMetadata = getRequestClientMetadata();
    const requestContext = getActionRequestContext();

    const parsedFlowId = AuthLoginFlowId.parse(flowId);
    if (isErr(parsedFlowId)) throwDomain(parsedFlowId.error);
    if (!isAuthenticationResponse(response)) {
      throwDomain(fail("invalid_credentials"));
    }

    const verifiedAt = runtime.auth.login.now();
    const verified = await verifyPasskeyLogin(runtime.auth.login.repos, {
      flowId: parsedFlowId.value,
      response,
      ipAddress: clientMetadata.ipAddress,
      occurredAt: verifiedAt,
      webauthnProvider: createRequestPasskeyProvider(runtime.auth.login.repos),
    });

    if (isErr(verified)) {
      await recordAuthAnalyticsEvent(
        {
          source: "server",
          kind: "passkey_result",
          outcome: "failed",
          code: verified.error.kind,
        },
        requestContext,
      );

      throwDomain(fail(verified.error.kind));
    }

    const completed = await completePendingLogin(runtime.auth.login, {
      proof: verified.value,
      occurredAt: verifiedAt,
      ipAddress: clientMetadata.ipAddress,
      userAgent: clientMetadata.userAgent,
    });
    if (isErr(completed)) {
      throwDomain(
        fail(
          completed.error.kind === "flow_expired"
            ? "flow_expired"
            : "invalid_credentials",
        ),
      );
    }

    await recordAuthAnalyticsEvent(
      {
        source: "server",
        kind: "passkey_result",
        outcome: "succeeded",
      },
      requestContext,
    );

    setSessionCookie(completed.value.token);

    return {
      redirectTo: getSessionPath(
        completed.value.sessionClass,
        completed.value.role,
      ),
    };
  });
}
