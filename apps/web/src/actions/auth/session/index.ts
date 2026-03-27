"use server";

import { getLoginFlowState } from "~/lib/auth/flows/login-state-service";
import { getCurrentUser, logoutUser } from "~/server/auth/application/session";
import { createAuthDeps } from "~/server/auth/infrastructure/deps";
import type { CurrentUserView } from "~/server/auth/types";
import { runAction } from "~/server/shared/action-runtime";

export type { CurrentUserView as CurrentUser } from "~/server/auth/types";

export async function getLoginFlow(flowId: number) {
  return getLoginFlowState(flowId, createAuthDeps().repos);
}

export async function logout(): Promise<void> {
  await runAction({
    actionName: "auth.session.logout",
    requireSession: true,
    execute: (ctx) => logoutUser(ctx, createAuthDeps()),
  });
}

export async function getMe(): Promise<CurrentUserView | null> {
  return runAction({
    actionName: "auth.session.get_me",
    requireSession: true,
    execute: (ctx) => getCurrentUser(ctx, createAuthDeps()),
  });
}
