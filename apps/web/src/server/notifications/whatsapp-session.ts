import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export function openSession(
  db: Kysely<Database>,
  userId: number,
  now: number,
): Promise<unknown> {
  return db
    .insertInto("whatsapp_sessions")
    .values({
      user_id: userId,
      expires_at: now + SESSION_DURATION_MS,
      created_at: now,
    })
    .onConflict((oc) =>
      oc
        .column("user_id")
        .doUpdateSet({ expires_at: now + SESSION_DURATION_MS }),
    )
    .execute();
}

export async function filterUsersWithActiveSession(
  db: Kysely<Database>,
  userIds: number[],
  now: number,
): Promise<Set<number>> {
  if (userIds.length === 0) return new Set();

  const rows = await db
    .selectFrom("whatsapp_sessions")
    .select("user_id")
    .where("user_id", "in", userIds)
    .where("expires_at", ">", now)
    .execute();

  return new Set(rows.map((r) => r.user_id));
}
