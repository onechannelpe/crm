"use server";

import type { CurrentUserView } from "~/actions/auth/contracts";
import { getCurrentUser, logoutUser } from "~/server/auth/application/session";
import { createAuthLoginContext } from "~/server/auth/infrastructure/login-context";
import {
  createAuthSessionLogoutContext,
  createAuthSessionReadContext,
} from "~/server/auth/infrastructure/session-context";
import { getLoginFlowState } from "~/server/features/auth/application/login/flow-state";
import { serverRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function getLoginFlow(flowId: number) {
  const loginContext = createAuthLoginContext(serverRuntime.infra.db);
  return getLoginFlowState(flowId, loginContext.repos);
}

export async function logout(): Promise<void> {
  await runAction({
    actionName: "auth.session.logout",
    access: { kind: "session" },
    execute: (ctx) =>
      logoutUser(
        ctx,
        createAuthSessionLogoutContext({
          executor: serverRuntime.infra.db,
          invalidateSession: (sessionId: string) =>
            serverRuntime.auth.sessionService.invalidateSession(sessionId),
        }),
      ),
  });
}

export async function getMe(): Promise<CurrentUserView | null> {
  return runAction({
    actionName: "auth.session.get_me",
    access: { kind: "session" },
    execute: (ctx) =>
      getCurrentUser(
        ctx,
        createAuthSessionReadContext({
          executor: serverRuntime.infra.db,
          invalidateSession: (sessionId: string) =>
            serverRuntime.auth.sessionService.invalidateSession(sessionId),
        }),
      ),
  });
}
