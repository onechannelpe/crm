"use server";

import type { ActionSuccess } from "~/contracts/common";
import { revokeAllUserSessions as revokeAllUserSessionsService } from "~/server/auth/flows/revoke-all-user-sessions";
import { revokeUserSession as revokeUserSessionService } from "~/server/auth/flows/revoke-user-session";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { parseObject, validationFail } from "~/server/shared/parsing";

export async function revokeUserSession(
  sessionId: unknown,
  targetUserId: unknown,
): Promise<ActionSuccess> {
  return runAction({
    name: "admin.sessions.revoke",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    parse: () =>
      parseObject({ sessionId, targetUserId }, validationFail, (r) => ({
        sessionId: r.str("sessionId"),
        targetUserId: r.posInt("targetUserId"),
      })),

    audit: ({ targetUserId }) => ({ targetUserId }),

    execute: (ctx, input) =>
      revokeUserSessionService(
        ctx,
        getServerRuntime().auth.adminSessionRevocation,
        input,
      ),
  });
}

export async function revokeAllUserSessions(
  targetUserId: unknown,
): Promise<ActionSuccess> {
  return runAction({
    name: "admin.sessions.revoke_all",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    parse: () =>
      parseObject({ targetUserId }, validationFail, (r) => ({
        targetUserId: r.posInt("targetUserId"),
      })),

    audit: ({ targetUserId }) => ({ targetUserId }),

    execute: (ctx, input) =>
      revokeAllUserSessionsService(
        ctx,
        getServerRuntime().auth.adminSessionRevocation,
        input,
      ),
  });
}
