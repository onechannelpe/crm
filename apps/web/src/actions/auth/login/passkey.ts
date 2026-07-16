"use server";

import { getSessionPath } from "~/lib/auth/access/route-policy";
import { recordAuthAnalyticsEvent } from "~/lib/auth/auth-analytics";
import { isAuthenticationResponse } from "~/lib/auth/passkey/credential-response";
import { setSessionCookie } from "~/lib/auth/session/cookies";
import { getRequestClientMetadata } from "~/lib/http/request-context";
import { getActionRequestContext } from "~/lib/observability/context";
import { verifyPasskeyLogin } from "~/server/auth/factors/passkey/service";
import { completePendingLogin } from "~/server/auth/flows/complete-pending-login";
import { createRequestPasskeyProvider } from "~/server/auth/infrastructure/request-passkey-provider";
import { runPublicAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { fail, throwDomain } from "~/server/shared/domain-error";
import { AuthLoginFlowId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

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
