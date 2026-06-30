import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { UserId } from "~/server/shared/ids";

import { createUsersRepo } from "./repos-users";

interface ExpireUsersDeps {
  executor: DatabaseExecutor;
  invalidateUserSessions: (userId: UserId) => Promise<void>;
}

export async function expireUsersAndInvalidateSessions(
  now: Date,
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
