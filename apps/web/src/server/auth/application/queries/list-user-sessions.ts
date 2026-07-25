import type { Selectable } from "kysely";

import type { UserId } from "~/domain/ids";
import type { AppContext } from "~/server/platform/action/context";
import type { Database } from "~/server/platform/database/types";

import type { AdminSessionsReadContext } from "../../infrastructure/admin-sessions-read-context";

type UserSessionRow = Selectable<Database["user_sessions"]>;

export async function listUserSessions(
  _ctx: AppContext,
  deps: AdminSessionsReadContext,
  input: { userId: UserId },
): Promise<UserSessionRow[]> {
  return deps.repos.sessions.listForUser(input.userId);
}
