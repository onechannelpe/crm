"use server";

import type { CurrentUserView } from "~/actions/auth/contracts";
import { getCurrentUser, logoutUser } from "~/server/auth/application/session";
import { getLoginFlowState } from "~/server/auth/application/login/flow-state";
import { serverRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function getLoginFlow(flowId: number) {
  return getLoginFlowState(flowId, serverRuntime.auth.login.repos);
}

export async function logout(): Promise<void> {
  await runAction({
    actionName: "auth.session.logout",
    access: { kind: "session" },
    execute: (ctx) => logoutUser(ctx, serverRuntime.auth.sessionLogout),
  });
}

export async function getMe(): Promise<CurrentUserView | null> {
  return runAction({
    actionName: "auth.session.get_me",
    access: { kind: "session" },
    execute: (ctx) => getCurrentUser(ctx, serverRuntime.auth.sessionRead),
  });
}
