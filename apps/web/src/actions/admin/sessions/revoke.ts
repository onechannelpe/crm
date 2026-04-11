"use server";

import { validationError } from "~/lib/app-errors";
import type { ActionSuccess } from "~/lib/contracts/common";
import { revokeAllUserSessions as revokeAllUserSessionsService } from "~/server/auth/application/commands/revoke-all-user-sessions";
import { revokeUserSession as revokeUserSessionService } from "~/server/auth/application/commands/revoke-user-session";
import { serverRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { isErr } from "~/server/shared/result";

import {
  parseRevokeAllUserSessionsInput,
  parseRevokeUserSessionInput,
} from "./input";

export async function revokeUserSession(
  sessionId: string,
  targetUserId: number,
): Promise<ActionSuccess> {
  const parsedInput = parseRevokeUserSessionInput({ sessionId, targetUserId });
  if (isErr(parsedInput)) {
    throw validationError(parsedInput.error.message);
  }
  return runAction({
    actionName: "admin.sessions.revoke",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",
    input: parsedInput.value,
    execute: (ctx) =>
      revokeUserSessionService(
        ctx,
        serverRuntime.auth.adminSessionRevocation,
        parsedInput.value,
      ),
  });
}

export async function revokeAllUserSessions(
  targetUserId: number,
): Promise<ActionSuccess> {
  const parsedInput = parseRevokeAllUserSessionsInput(targetUserId);
  if (isErr(parsedInput)) {
    throw validationError(parsedInput.error.message);
  }
  return runAction({
    actionName: "admin.sessions.revoke_all",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",
    input: parsedInput.value,
    execute: (ctx) =>
      revokeAllUserSessionsService(
        ctx,
        serverRuntime.auth.adminSessionRevocation,
        parsedInput.value,
      ),
  });
}
