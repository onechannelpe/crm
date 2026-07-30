import type { ActionSuccess } from "~/contracts/common";
import { UserId } from "~/domain/ids";
import { revokeAllUserSessions as revokeAllUserSessionsService } from "~/server/auth/flows/revoke-all-user-sessions";
import { revokeUserSession as revokeUserSessionService } from "~/server/auth/flows/revoke-user-session";
import { executeAdminServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getAuthRuntime } from "~/server/platform/container/auth-runtime";

export async function revokeUserSession(
  rawSessionId: unknown,
  rawTargetUserId: unknown,
): Promise<ActionSuccess> {
  "use server";

  return executeAdminServerFunction({
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
        getAuthRuntime().adminSessionRevocation,
        input,
      ),
  });
}

export async function revokeAllUserSessions(
  rawTargetUserId: unknown,
): Promise<ActionSuccess> {
  "use server";

  return executeAdminServerFunction({
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
        getAuthRuntime().adminSessionRevocation,
        input,
      ),
  });
}
