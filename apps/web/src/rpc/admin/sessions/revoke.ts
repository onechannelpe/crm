import type { ActionSuccess } from "~/contracts/common";
import { UserId } from "~/domain/ids";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";

export async function revokeUserSession(
  rawSessionId: unknown,
  rawTargetUserId: unknown,
): Promise<ActionSuccess> {
  "use server";

  return executeSessionServerFunction({
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

    execute: (ctx, input) => application.auth.sessions.revoke(ctx, input),
  });
}

export async function revokeAllUserSessions(
  rawTargetUserId: unknown,
): Promise<ActionSuccess> {
  "use server";

  return executeSessionServerFunction({
    name: "admin.sessions.revoke_all",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    parse: () =>
      parseObject({ targetUserId: rawTargetUserId }, validationFail, (r) => ({
        targetUserId: r.id("targetUserId", UserId),
      })),

    audit: (command) => ({ targetUserId: command.targetUserId }),

    execute: (ctx, input) => application.auth.sessions.revokeAll(ctx, input),
  });
}
