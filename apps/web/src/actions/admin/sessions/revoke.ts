"use server";

import type { ActionSuccess } from "~/contracts/common";
import { revokeAllUserSessions as revokeAllUserSessionsService } from "~/server/auth/application/commands/revoke-all-user-sessions";
import { revokeUserSession as revokeUserSessionService } from "~/server/auth/application/commands/revoke-user-session";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

import {
  parseRevokeAllUserSessionsInput,
  parseRevokeUserSessionInput,
} from "./input";

export async function revokeUserSession(
  sessionId: string,
  targetUserId: number,
): Promise<ActionSuccess> {
  return runAction({
    actionName: "admin.sessions.revoke",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",
    parse: () => parseRevokeUserSessionInput({ sessionId, targetUserId }),
    audit: ({ targetUserId }) => ({ targetUserId }),
    execute: (ctx, parsed) =>
      revokeUserSessionService(
        ctx,
        getServerRuntime().auth.adminSessionRevocation,
        parsed,
      ),
  });
}

export async function revokeAllUserSessions(
  targetUserId: number,
): Promise<ActionSuccess> {
  return runAction({
    actionName: "admin.sessions.revoke_all",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",
    parse: () => parseRevokeAllUserSessionsInput(targetUserId),
    audit: ({ targetUserId }) => ({ targetUserId }),
    execute: (ctx, parsed) =>
      revokeAllUserSessionsService(
        ctx,
        getServerRuntime().auth.adminSessionRevocation,
        parsed,
      ),
  });
}
