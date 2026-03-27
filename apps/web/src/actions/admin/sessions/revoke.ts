"use server";

import { validationError } from "~/lib/app-errors";
import { assertRecentStrongAuth } from "~/lib/auth/security/step-up";
import type { ActionSuccess } from "~/lib/contracts/common";
import {
  revokeAllUserSessions as revokeAllUserSessionsService,
  revokeUserSession as revokeUserSessionService,
} from "~/server/auth/service-admin-sessions";
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
  const { requireRole } = await import("~/lib/auth/access/session");
  const session = await requireRole("admin");
  assertRecentStrongAuth(session);
  return runAction({
    actionName: "admin.sessions.revoke",
    actor: session,
    input: parsedInput.value,
    execute: (ctx) => revokeUserSessionService(ctx, parsedInput.value),
  });
}

export async function revokeAllUserSessions(
  targetUserId: number,
): Promise<ActionSuccess> {
  const parsedInput = parseRevokeAllUserSessionsInput(targetUserId);
  if (isErr(parsedInput)) {
    throw validationError(parsedInput.error.message);
  }
  const { requireRole } = await import("~/lib/auth/access/session");
  const session = await requireRole("admin");
  assertRecentStrongAuth(session);
  return runAction({
    actionName: "admin.sessions.revoke_all",
    actor: session,
    input: parsedInput.value,
    execute: (ctx) => revokeAllUserSessionsService(ctx, parsedInput.value),
  });
}
