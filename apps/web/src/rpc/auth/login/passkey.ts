import { getSessionPath } from "~/domain/auth/access/route-policy";
import { isAuthenticationResponse } from "~/domain/auth/passkey/credential-response";
import { fail } from "~/domain/errors";
import { AuthLoginFlowId } from "~/domain/ids";
import { setSessionCookie } from "~/server/auth/session/cookies";
import { getApplication } from "~/server/composition/application";
import { throwDomain } from "~/server/platform/action/domain-error";
import {
  getRequestClientMetadata,
  getRequestContext,
  getRequestOperation,
} from "~/server/platform/http/request-context-storage";
import { getActionRequestContext } from "~/server/platform/observability/context";
import { isErr } from "~/shared/result";

export async function finishPasskeyLogin(
  flowId: unknown,
  response: unknown,
): Promise<{ redirectTo: string }> {
  "use server";

  const clientMetadata = getRequestClientMetadata();
  const requestContext = getActionRequestContext();
  const operation = getRequestOperation();

  const parsedFlowId = AuthLoginFlowId.parse(flowId);
  if (isErr(parsedFlowId)) {
    throwDomain(parsedFlowId.error);
  }

  if (!isAuthenticationResponse(response)) {
    throwDomain(fail("invalid_credentials"));
  }

  const verified = await getApplication().auth.login.verifyPasskey(
    {
      flowId: parsedFlowId.value,
      response,
      ipAddress: clientMetadata.ipAddress,
    },
    getRequestContext().publicOrigin,
    operation,
  );

  if (isErr(verified)) {
    await getApplication().auth.analytics(
      {
        source: "server",
        kind: "passkey_result",
        outcome: "failed",
        code: verified.error.kind,
      },
      requestContext,
      operation,
    );

    throwDomain(fail(verified.error.kind));
  }

  const completed = await getApplication().auth.login.complete(
    {
      proof: verified.value,
      ipAddress: clientMetadata.ipAddress,
      userAgent: clientMetadata.userAgent,
    },
    operation,
  );

  if (isErr(completed)) {
    throwDomain(
      fail(
        completed.error.kind === "flow_expired"
          ? "flow_expired"
          : "invalid_credentials",
      ),
    );
  }

  await getApplication().auth.analytics(
    {
      source: "server",
      kind: "passkey_result",
      outcome: "succeeded",
    },
    requestContext,
    operation,
  );

  setSessionCookie(completed.value.token);

  return {
    redirectTo: getSessionPath(
      completed.value.sessionClass,
      completed.value.role,
    ),
  };
}
