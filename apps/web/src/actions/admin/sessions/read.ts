"use server";

import type { SessionInfo } from "~/actions/auth/contracts";
import { validationError } from "~/lib/app-errors";
import {
  countActiveSessions as countActiveSessionsService,
  listAllActiveSessions as listAllActiveSessionsService,
  listUserSessions as listUserSessionsService,
} from "~/server/auth/application/admin-sessions";
import { createAdminSessionsReadContext } from "~/server/auth/infrastructure/admin-sessions-read-context";
import { serverRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { isErr, Ok } from "~/server/shared/result";

import { parseUserSessionsInput } from "./input";

export async function listUserSessions(userId: number) {
  const parsedInput = parseUserSessionsInput(userId);
  if (isErr(parsedInput)) {
    throw validationError(parsedInput.error.message);
  }
  const readContext = createAdminSessionsReadContext(serverRuntime.infra.db);
  return runAction({
    actionName: "admin.sessions.user.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",
    input: parsedInput.value,
    execute: async (ctx) =>
      Ok(await listUserSessionsService(ctx, readContext, parsedInput.value)),
  });
}

export async function getActiveSessionsCount(): Promise<number> {
  const readContext = createAdminSessionsReadContext(serverRuntime.infra.db);
  return runAction({
    actionName: "admin.sessions.count.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",
    execute: async () => Ok(await countActiveSessionsService(readContext)),
  });
}

export async function listAllActiveSessions(): Promise<SessionInfo[]> {
  const readContext = createAdminSessionsReadContext(serverRuntime.infra.db);
  return runAction({
    actionName: "admin.sessions.active.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",
    execute: async () => Ok(await listAllActiveSessionsService(readContext)),
  });
}
