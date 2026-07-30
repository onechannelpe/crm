import type { SessionInfo } from "~/contracts/auth";
import { UserId } from "~/domain/ids";
import { countActiveSessions as countActiveSessionsService } from "~/server/auth/application/queries/count-active-sessions";
import { listAllActiveSessions as listAllActiveSessionsService } from "~/server/auth/application/queries/list-all-active-sessions";
import { listUserSessions as listUserSessionsService } from "~/server/auth/application/queries/list-user-sessions";
import { executeAdminServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getAuthRuntime } from "~/server/platform/container/auth-runtime";
import { Ok } from "~/shared/result";

export async function listUserSessions(rawUserId: unknown) {
  "use server";

  return executeAdminServerFunction({
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
          getAuthRuntime().adminSessionsRead,
          parsed,
        ),
      ),
  });
}

export async function getActiveSessionsCount(): Promise<number> {
  "use server";

  return executeAdminServerFunction({
    name: "admin.sessions.count.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    execute: async () =>
      Ok(await countActiveSessionsService(getAuthRuntime().adminSessionsRead)),
  });
}

export async function listAllActiveSessions(): Promise<SessionInfo[]> {
  "use server";

  return executeAdminServerFunction({
    name: "admin.sessions.active.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    execute: async () =>
      Ok(
        await listAllActiveSessionsService(getAuthRuntime().adminSessionsRead),
      ),
  });
}
