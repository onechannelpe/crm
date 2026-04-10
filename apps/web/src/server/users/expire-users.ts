import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { createUsersRepo } from "./repos-users";

interface ExpireUsersDeps {
  executor: DatabaseExecutor;
  invalidateUserSessions: (userId: number) => Promise<void>;
}

export async function expireUsersAndInvalidateSessions(
  now: number,
  deps: ExpireUsersDeps,
): Promise<number> {
  const users = createUsersRepo(deps.executor);
  const expiredUserIds = await users.expireActiveUsersBefore(now);

  for (const userId of expiredUserIds) {
    // eslint-disable-next-line no-await-in-loop
    await deps.invalidateUserSessions(userId);
  }

  return expiredUserIds.length;
}
