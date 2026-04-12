"use server";

import type { SessionInfo } from "~/actions/auth/contracts";
import { validationError } from "~/lib/app-errors";
import { countActiveSessions as countActiveSessionsService } from "~/server/auth/application/queries/count-active-sessions";
import { listAllActiveSessions as listAllActiveSessionsService } from "~/server/auth/application/queries/list-all-active-sessions";
import { listUserSessions as listUserSessionsService } from "~/server/auth/application/queries/list-user-sessions";
import { serverRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { isErr, Ok } from "~/server/shared/result";

import { parseUserSessionsInput } from "./input";

export async function listUserSessions(userId: number) {
  const parsedInput = parseUserSessionsInput(userId);
  if (isErr(parsedInput)) {
    throw validationError(parsedInput.error.message);
  }
  return runAction({
    actionName: "admin.sessions.user.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",
    input: parsedInput.value,
    execute: async (ctx) =>
      Ok(
        await listUserSessionsService(
          ctx,
          serverRuntime.auth.adminSessionsRead,
          parsedInput.value,
        ),
      ),
  });
}

export async function getActiveSessionsCount(): Promise<number> {
  return runAction({
    actionName: "admin.sessions.count.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",
    execute: async () =>
      Ok(
        await countActiveSessionsService(serverRuntime.auth.adminSessionsRead),
      ),
  });
}

export async function listAllActiveSessions(): Promise<SessionInfo[]> {
  return runAction({
    actionName: "admin.sessions.active.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",
    execute: async () =>
      Ok(
        await listAllActiveSessionsService(
          serverRuntime.auth.adminSessionsRead,
        ),
      ),
  });
}
