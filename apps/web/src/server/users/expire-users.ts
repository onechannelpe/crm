import { serverRuntime } from "~/server/runtime";
import { createUsersRepo } from "~/server/users/repos-users";

const users = createUsersRepo(serverRuntime.infra.db);

export async function expireUsersAndInvalidateSessions(
  now: number,
): Promise<number> {
  const expiredUserIds = await users.expireActiveUsersBefore(now);

  for (const userId of expiredUserIds) {
    // eslint-disable-next-line no-await-in-loop
    await serverRuntime.auth.sessionService.invalidateUserSessions(userId);
  }

  return expiredUserIds.length;
}
