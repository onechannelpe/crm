"use server";

import type { CurrentUserView } from "~/contracts/auth";
import { getCurrentUser } from "~/server/auth/application/queries/get-current-user";
import { getLoginFlowState } from "~/server/auth/application/queries/get-login-flow-state";
import { logoutUser } from "~/server/auth/flows/logout-user";
import { createRequestPasskeyProvider } from "~/server/auth/infrastructure/request-passkey-provider";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { AuthLoginFlowId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

export async function getLoginFlow(flowId: string) {
  const parsedFlowId = AuthLoginFlowId.parse(flowId);
  if (isErr(parsedFlowId)) return null;

  const repos = getServerRuntime().auth.login.repos;
  return getLoginFlowState(
    parsedFlowId.value,
    repos,
    createRequestPasskeyProvider(repos),
  );
}

export async function logout(): Promise<void> {
  await runAction({
    name: "auth.session.logout",
    access: { kind: "session" },
    execute: (ctx) => logoutUser(ctx, getServerRuntime().auth.sessionLogout),
  });
}

export async function getMe(): Promise<CurrentUserView | null> {
  return runAction({
    name: "auth.session.get_me",
    access: { kind: "session" },
    execute: (ctx) => getCurrentUser(ctx, getServerRuntime().auth.sessionRead),
  });
}
