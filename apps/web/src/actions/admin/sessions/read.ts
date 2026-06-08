"use server";

import type { SessionInfo } from "~/actions/auth/contracts";
import { countActiveSessions as countActiveSessionsService } from "~/server/auth/application/queries/count-active-sessions";
import { listAllActiveSessions as listAllActiveSessionsService } from "~/server/auth/application/queries/list-all-active-sessions";
import { listUserSessions as listUserSessionsService } from "~/server/auth/application/queries/list-user-sessions";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok } from "~/server/shared/result";

export async function listUserSessions(userId: unknown) {
  return runAction({
    actionName: "admin.sessions.user.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",
    parse: () =>
      parseObject({ userId }, validationFail, (r) => ({
        userId: r.posInt("userId"),
      })),
    audit: ({ userId }) => ({ userId }),
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
    actionName: "admin.sessions.count.read",
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
    actionName: "admin.sessions.active.read",
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
