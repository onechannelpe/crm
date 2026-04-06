"use server";

import { getLoginFlowState } from "~/lib/auth/flows/login-state-service";
import { getCurrentUser, logoutUser } from "~/server/auth/application/session";
import type { CurrentUserView } from "~/server/auth/application/views/current-user-view";
import { createAuthLoginContext } from "~/server/auth/infrastructure/login-context";
import {
  createAuthSessionLogoutContext,
  createAuthSessionReadContext,
} from "~/server/auth/infrastructure/session-context";
import { runAction } from "~/server/shared/action-runtime";

export type { CurrentUserView as CurrentUser } from "~/server/auth/application/views/current-user-view";

export async function getLoginFlow(flowId: number) {
  return getLoginFlowState(flowId, createAuthLoginContext().repos);
}

export async function logout(): Promise<void> {
  await runAction({
    actionName: "auth.session.logout",
    requireSession: true,
    execute: (ctx) => logoutUser(ctx, createAuthSessionLogoutContext()),
  });
}

export async function getMe(): Promise<CurrentUserView | null> {
  return runAction({
    actionName: "auth.session.get_me",
    requireSession: true,
    execute: (ctx) => getCurrentUser(ctx, createAuthSessionReadContext()),
  });
}
