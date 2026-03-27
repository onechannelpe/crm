import { invalidateUserSessions } from "~/lib/auth/session/session-manager";
import { repos } from "~/server/shared/context";

export async function expireUsersAndInvalidateSessions(
  now: number,
): Promise<number> {
  const expiredUserIds = await repos.users.expireActiveUsersBefore(now);

  for (const userId of expiredUserIds) {
    // eslint-disable-next-line no-await-in-loop
    await invalidateUserSessions(userId);
  }

  return expiredUserIds.length;
}
