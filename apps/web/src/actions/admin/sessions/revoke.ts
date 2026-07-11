"use server";

import type { ActionSuccess } from "~/contracts/common";
import { revokeAllUserSessions as revokeAllUserSessionsService } from "~/server/auth/flows/revoke-all-user-sessions";
import { revokeUserSession as revokeUserSessionService } from "~/server/auth/flows/revoke-user-session";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { UserId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";

export async function revokeUserSession(
  rawSessionId: unknown,
  rawTargetUserId: unknown,
): Promise<ActionSuccess> {
  return runAction({
    name: "admin.sessions.revoke",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    parse: () =>
      parseObject(
        { sessionId: rawSessionId, targetUserId: rawTargetUserId },
        validationFail,
        (r) => ({
          sessionId: r.str("sessionId"),
          targetUserId: r.id("targetUserId", UserId),
        }),
      ),

    audit: (command) => ({ targetUserId: command.targetUserId }),

    execute: (ctx, input) =>
      revokeUserSessionService(
        ctx,
        getServerRuntime().auth.adminSessionRevocation,
        input,
      ),
  });
}

export async function revokeAllUserSessions(
  rawTargetUserId: unknown,
): Promise<ActionSuccess> {
  return runAction({
    name: "admin.sessions.revoke_all",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    parse: () =>
      parseObject({ targetUserId: rawTargetUserId }, validationFail, (r) => ({
        targetUserId: r.id("targetUserId", UserId),
      })),

    audit: (command) => ({ targetUserId: command.targetUserId }),

    execute: (ctx, input) =>
      revokeAllUserSessionsService(
        ctx,
        getServerRuntime().auth.adminSessionRevocation,
        input,
      ),
  });
}
