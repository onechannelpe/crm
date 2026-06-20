"use server";

import type { CurrentUserView } from "~/actions/auth/contracts";
import { getCurrentUser } from "~/server/auth/application/queries/get-current-user";
import { getLoginFlowState } from "~/server/auth/application/queries/get-login-flow-state";
import { logoutUser } from "~/server/auth/flows/logout-user";
import { createRequestPasskeyProvider } from "~/server/auth/infrastructure/request-passkey-provider";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";

export async function getLoginFlow(flowId: number) {
  const repos = getServerRuntime().auth.login.repos;
  return getLoginFlowState(flowId, repos, createRequestPasskeyProvider(repos));
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
