"use server";

import type { CurrentUserView } from "~/contracts/auth";
import { AuthLoginFlowId } from "~/domain/ids";
import { getCurrentUser } from "~/server/auth/application/queries/get-current-user";
import { getLoginFlowState } from "~/server/auth/application/queries/get-login-flow-state";
import { logoutUser } from "~/server/auth/flows/logout-user";
import { createRequestPasskeyProvider } from "~/server/auth/infrastructure/request-passkey-provider";
import { runAction } from "~/server/platform/action";
import { getAuthRuntime } from "~/server/platform/container/auth-runtime";
import { isErr } from "~/shared/result";

export async function getLoginFlow(flowId: string) {
  const parsedFlowId = AuthLoginFlowId.parse(flowId);
  if (isErr(parsedFlowId)) return null;

  const repos = getAuthRuntime().login.repos;
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
    execute: (ctx) => logoutUser(ctx, getAuthRuntime().sessionLogout),
  });
}

export async function getMe(): Promise<CurrentUserView | null> {
  return runAction({
    name: "auth.session.get_me",
    access: { kind: "session" },
    execute: (ctx) => getCurrentUser(ctx, getAuthRuntime().sessionRead),
  });
}
