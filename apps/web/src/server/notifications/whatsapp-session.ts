import type { UserId } from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export async function openSession(
  db: DatabaseExecutor,
  userId: UserId,
  messageSentAt: Date,
): Promise<void> {
  const expiresAt = new Date(messageSentAt.getTime() + SESSION_DURATION_MS);
  await db
    .insertInto("whatsapp_sessions")
    .values({
      user_id: userId,
      expires_at: expiresAt,
    })
    .onConflict((oc) =>
      oc.column("user_id").doUpdateSet((eb) => ({
        expires_at: eb.fn<Date>("greatest", [
          "whatsapp_sessions.expires_at",
          eb.ref("excluded.expires_at"),
        ]),
      })),
    )
    .execute();
}

export async function filterUsersWithActiveSession(
  db: DatabaseExecutor,
  userIds: UserId[],
  activeAsOf: Date,
): Promise<Set<UserId>> {
  if (userIds.length === 0) return new Set();

  const rows = await db
    .selectFrom("whatsapp_sessions")
    .select("user_id")
    .where("user_id", "in", userIds)
    .where("expires_at", ">", activeAsOf)
    .execute();

  return new Set(rows.map((r) => r.user_id));
}
