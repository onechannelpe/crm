import type { SessionInfo } from "~/contracts/auth";
import { UserId } from "~/domain/ids";
import { application } from "~/server/composition/application";
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

    telemetry: (query) => ({ userId: query.userId }),

    execute: async (ctx, parsed) =>
      Ok(await application.auth.sessions.listForUser(ctx, parsed)),
  });
}

export async function getActiveSessionsCount(): Promise<number> {
  "use server";

  return executeSessionServerFunction({
    name: "admin.sessions.count.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    execute: async (ctx) =>
      Ok(await application.auth.sessions.countActive(ctx)),
  });
}

export async function listAllActiveSessions(): Promise<SessionInfo[]> {
  "use server";

  return executeSessionServerFunction({
    name: "admin.sessions.active.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    execute: async (ctx) => Ok(await application.auth.sessions.listActive(ctx)),
  });
}
