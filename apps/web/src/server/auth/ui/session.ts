import "server-only";
import type { CurrentUserView } from "~/contracts/auth";
import { AuthLoginFlowId } from "~/domain/ids";
import { getCurrentUser } from "~/server/auth/application/queries/get-current-user";
import { getLoginFlowState } from "~/server/auth/application/queries/get-login-flow-state";
import { createAuthLoginContext } from "~/server/auth/infrastructure/login-context";
import { createRequestPasskeyProvider } from "~/server/auth/infrastructure/request-passkey-provider";
import { createAuthSessionReadContext } from "~/server/auth/infrastructure/session-context";
import { executeSessionServerFunction } from "~/server/platform/action";
import { db } from "~/server/platform/database/db";
import { getRequestInstant } from "~/server/platform/http/request-context";
import { isErr } from "~/shared/result";

const loginContext = createAuthLoginContext(db);
const sessionReadContext = createAuthSessionReadContext(db);

export async function getLoginFlow(flowId: string) {
  const parsedFlowId = AuthLoginFlowId.parse(flowId);
  if (isErr(parsedFlowId)) return null;

  const repos = loginContext.repos;
  return getLoginFlowState(
    parsedFlowId.value,
    repos,
    createRequestPasskeyProvider(repos),
    getRequestInstant(),
  );
}

export async function getMe(): Promise<CurrentUserView | null> {
  return executeSessionServerFunction({
    name: "auth.session.get_me",
    access: { kind: "session" },
    execute: (ctx) => getCurrentUser(ctx, sessionReadContext),
  });
}
