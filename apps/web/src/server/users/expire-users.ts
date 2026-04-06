import { invalidateUserSessions } from "~/lib/auth/session/session-manager";
import { db } from "~/lib/db/db";
import { createUsersRepo } from "~/server/users/repos-users";

const users = createUsersRepo(db);

export async function expireUsersAndInvalidateSessions(
  now: number,
): Promise<number> {
  const expiredUserIds = await users.expireActiveUsersBefore(now);

  for (const userId of expiredUserIds) {
    // eslint-disable-next-line no-await-in-loop
    await invalidateUserSessions(userId);
  }

  return expiredUserIds.length;
}
