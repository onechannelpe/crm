"use server";

import type { CurrentUserView } from "~/actions/auth/contracts";
import { logoutUser } from "~/server/auth/application/commands/logout-user";
import { getCurrentUser } from "~/server/auth/application/queries/get-current-user";
import { getLoginFlowState } from "~/server/auth/application/queries/get-login-flow-state";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function getLoginFlow(flowId: number) {
  return getLoginFlowState(flowId, getServerRuntime().auth.login.repos);
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
