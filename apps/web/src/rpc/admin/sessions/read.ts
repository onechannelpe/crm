import type { SessionInfo } from "~/contracts/auth";
import { UserId } from "~/domain/ids";
import { countActiveSessions as countActiveSessionsService } from "~/server/auth/application/queries/count-active-sessions";
import { listAllActiveSessions as listAllActiveSessionsService } from "~/server/auth/application/queries/list-all-active-sessions";
import { listUserSessions as listUserSessionsService } from "~/server/auth/application/queries/list-user-sessions";
import { composeAuth } from "~/server/auth/ui/composition";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { Ok } from "~/shared/result";

export async function listUserSessions(rawUserId: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "admin.sessions.user.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    parse: () =>
      parseObject({ userId: rawUserId }, validationFail, (r) => ({
        userId: r.id("userId", UserId),
      })),

    audit: (query) => ({ userId: query.userId }),

    execute: async (ctx, parsed) =>
      Ok(
        await listUserSessionsService(
          ctx,
          composeAuth().adminSessionsRead,
          parsed,
        ),
      ),
  });
}

export async function getActiveSessionsCount(): Promise<number> {
  "use server";

  return executeSessionServerFunction({
    name: "admin.sessions.count.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    execute: async (ctx) =>
      Ok(
        await countActiveSessionsService(
          composeAuth().adminSessionsRead,
          ctx.operationAt,
        ),
      ),
  });
}

export async function listAllActiveSessions(): Promise<SessionInfo[]> {
  "use server";

  return executeSessionServerFunction({
    name: "admin.sessions.active.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    execute: async (ctx) =>
      Ok(
        await listAllActiveSessionsService(
          composeAuth().adminSessionsRead,
          ctx.operationAt,
        ),
      ),
  });
}
