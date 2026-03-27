"use server";

import { getCurrentUser, logoutUser } from "~/server/auth/service-session";
import type { CurrentUserView } from "~/server/auth/types";
import { runAction } from "~/server/shared/action-runtime";

export type { CurrentUserView as CurrentUser } from "~/server/auth/types";

export async function logout(): Promise<void> {
  await runAction({
    actionName: "auth.session.logout",
    requireSession: true,
    execute: (ctx) => logoutUser(ctx),
  });
}

export async function getMe(): Promise<CurrentUserView | null> {
  return runAction({
    actionName: "auth.session.get_me",
    requireSession: true,
    execute: (ctx) => getCurrentUser(ctx),
  });
}
