import { serverRuntime } from "~/server/runtime";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createUsersRepo } from "~/server/users/repos-users";

interface ExpireUsersDeps {
  executor?: DatabaseExecutor;
  invalidateUserSessions?: (userId: number) => Promise<void>;
}

export async function expireUsersAndInvalidateSessions(
  now: number,
  deps: ExpireUsersDeps = {},
): Promise<number> {
  const users = createUsersRepo(deps.executor ?? serverRuntime.infra.db);
  const invalidateUserSessions =
    deps.invalidateUserSessions ??
    ((userId: number) =>
      serverRuntime.auth.sessionService.invalidateUserSessions(userId));
  const expiredUserIds = await users.expireActiveUsersBefore(now);

  for (const userId of expiredUserIds) {
    // eslint-disable-next-line no-await-in-loop
    await invalidateUserSessions(userId);
  }

  return expiredUserIds.length;
}
