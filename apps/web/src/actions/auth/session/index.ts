"use server";

import { getRequestContext } from "~/lib/http/request-context";
import { traceServerAction } from "~/lib/observability/diagnostics";
import {
  getCurrentUser,
  logoutUser,
} from "~/server/auth/service-session";

export type { CurrentUserView as CurrentUser } from "~/server/auth/types";

export async function logout(): Promise<void> {
  await logoutUser(await getRequestContext().getAuthSession());
}

export async function getMe(): Promise<CurrentUser | null> {
  return traceServerAction("auth-session-action", "get_me", async () =>
    getCurrentUser(await getRequestContext().getAuthSession()),
  );
}
