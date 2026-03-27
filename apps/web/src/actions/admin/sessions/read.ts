"use server";

import { validationError } from "~/lib/app-errors";
import { assertRecentStrongAuth } from "~/lib/auth/security/step-up";
import { runAction } from "~/server/shared/action-runtime";
import {
  countActiveSessions as countActiveSessionsService,
  listAllActiveSessions as listAllActiveSessionsService,
  listUserSessions as listUserSessionsService,
  type SessionInfo,
} from "~/server/auth/service-admin-sessions";
import { isErr } from "~/server/shared/result";

import { parseUserSessionsInput } from "./input";

export { type SessionInfo } from "~/server/auth/service-admin-sessions";

export async function listUserSessions(userId: number) {
  const parsedInput = parseUserSessionsInput(userId);
  if (isErr(parsedInput)) {
    throw validationError(parsedInput.error.message);
  }
  const { requireRole } = await import("~/lib/auth/access/session");
  const session = await requireRole("admin");
  assertRecentStrongAuth(session);
  return runAction({
    actionName: "admin.sessions.user.read",
    actor: session,
    input: parsedInput.value,
    execute: (ctx) => listUserSessionsService(ctx, parsedInput.value),
  });
}

export async function getActiveSessionsCount(): Promise<number> {
  const { requireRole } = await import("~/lib/auth/access/session");
  const session = await requireRole("admin");
  assertRecentStrongAuth(session);
  return runAction({
    actionName: "admin.sessions.count.read",
    actor: session,
    execute: () => countActiveSessionsService(),
  });
}

export async function listAllActiveSessions(): Promise<SessionInfo[]> {
  const { requireRole } = await import("~/lib/auth/access/session");
  const session = await requireRole("admin");
  assertRecentStrongAuth(session);
  return runAction({
    actionName: "admin.sessions.active.read",
    actor: session,
    execute: () => listAllActiveSessionsService(),
  });
}
