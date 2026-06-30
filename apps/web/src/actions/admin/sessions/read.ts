"use server";

import type { SessionInfo } from "~/actions/auth/contracts";
import { countActiveSessions as countActiveSessionsService } from "~/server/auth/application/queries/count-active-sessions";
import { listAllActiveSessions as listAllActiveSessionsService } from "~/server/auth/application/queries/list-all-active-sessions";
import { listUserSessions as listUserSessionsService } from "~/server/auth/application/queries/list-user-sessions";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { asUserId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok } from "~/server/shared/result";

export async function listUserSessions(rawUserId: unknown) {
  return runAction({
    name: "admin.sessions.user.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    parse: () =>
      parseObject({ userId: rawUserId }, validationFail, (r) => ({
        userId: asUserId(r.str("userId")),
      })),

    audit: (query) => ({ userId: query.userId }),

    execute: async (ctx, parsed) =>
      Ok(
        await listUserSessionsService(
          ctx,
          getServerRuntime().auth.adminSessionsRead,
          parsed,
        ),
      ),
  });
}

export async function getActiveSessionsCount(): Promise<number> {
  return runAction({
    name: "admin.sessions.count.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    execute: async () =>
      Ok(
        await countActiveSessionsService(
          getServerRuntime().auth.adminSessionsRead,
        ),
      ),
  });
}

export async function listAllActiveSessions(): Promise<SessionInfo[]> {
  return runAction({
    name: "admin.sessions.active.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    execute: async () =>
      Ok(
        await listAllActiveSessionsService(
          getServerRuntime().auth.adminSessionsRead,
        ),
      ),
  });
}
