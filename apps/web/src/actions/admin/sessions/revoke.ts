"use server";

import { validationError } from "~/lib/app-errors";
import type { ActionSuccess } from "~/lib/contracts/common";
import {
  revokeAllUserSessions as revokeAllUserSessionsService,
  revokeUserSession as revokeUserSessionService,
} from "~/server/auth/application/admin-sessions";
import { createAdminSessionRevocationPort } from "~/server/auth/infrastructure/admin-session-revocation-port";
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
    role: "admin",
    stepUp: "recent_strong_auth",
    input: parsedInput.value,
    execute: (ctx) =>
      revokeUserSessionService(
        ctx,
        createAdminSessionRevocationPort(),
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
    role: "admin",
    stepUp: "recent_strong_auth",
    input: parsedInput.value,
    execute: (ctx) =>
      revokeAllUserSessionsService(
        ctx,
        createAdminSessionRevocationPort(),
        parsedInput.value,
      ),
  });
}
