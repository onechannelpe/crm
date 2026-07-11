import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { UserId } from "~/server/shared/ids";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export async function openSession(
  db: DatabaseExecutor,
  userId: UserId,
  now: Date,
): Promise<void> {
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
  await db
    .insertInto("whatsapp_sessions")
    .values({
      user_id: userId,
      expires_at: expiresAt,
    })
    .onConflict((oc) =>
      oc.column("user_id").doUpdateSet({ expires_at: expiresAt }),
    )
    .execute();
}

export async function filterUsersWithActiveSession(
  db: DatabaseExecutor,
  userIds: UserId[],
  now: Date,
): Promise<Set<UserId>> {
  if (userIds.length === 0) return new Set();

  const rows = await db
    .selectFrom("whatsapp_sessions")
    .select("user_id")
    .where("user_id", "in", userIds)
    .where("expires_at", ">", now)
    .execute();

  return new Set(rows.map((r) => r.user_id));
}
