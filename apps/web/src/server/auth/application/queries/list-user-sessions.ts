import type { Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { AppContext } from "~/server/platform/action/context";

import type { AdminSessionsReadContext } from "../../infrastructure/admin-sessions-read-context";

type UserSessionRow = Selectable<Database["user_sessions"]>;

export async function listUserSessions(
  _ctx: AppContext,
  deps: AdminSessionsReadContext,
  input: { userId: number },
): Promise<UserSessionRow[]> {
  return deps.repos.sessions.listForUser(input.userId);
}
