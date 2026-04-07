"use server";

import type { SessionInfo } from "~/actions/auth/contracts";
import { validationError } from "~/lib/app-errors";
import {
  countActiveSessions as countActiveSessionsService,
  listAllActiveSessions as listAllActiveSessionsService,
  listUserSessions as listUserSessionsService,
} from "~/server/auth/application/admin-sessions";
import { createAdminSessionsReadContext } from "~/server/auth/infrastructure/admin-sessions-read-context";
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
    role: "admin",
    stepUp: "recent_strong_auth",
    input: parsedInput.value,
    execute: async (ctx) =>
      Ok(
        await listUserSessionsService(
          ctx,
          createAdminSessionsReadContext(),
          parsedInput.value,
        ),
      ),
  });
}

export async function getActiveSessionsCount(): Promise<number> {
  return runAction({
    actionName: "admin.sessions.count.read",
    role: "admin",
    stepUp: "recent_strong_auth",
    execute: async () =>
      Ok(await countActiveSessionsService(createAdminSessionsReadContext())),
  });
}

export async function listAllActiveSessions(): Promise<SessionInfo[]> {
  return runAction({
    actionName: "admin.sessions.active.read",
    role: "admin",
    stepUp: "recent_strong_auth",
    execute: async () =>
      Ok(await listAllActiveSessionsService(createAdminSessionsReadContext())),
  });
}
