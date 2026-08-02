import type { UserId } from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

import { createUsersRepo } from "./repos-users";

interface ExpireUsersDeps {
  executor: DatabaseExecutor;
  invalidateUserSessions: (userId: UserId) => Promise<void>;
}

export async function expireUsersAndInvalidateSessions(
  expiredBefore: Date,
  deps: ExpireUsersDeps,
): Promise<number> {
  const users = createUsersRepo(deps.executor);
  const expiredUserIds = await users.expireActiveUsersBefore(expiredBefore);

  for (const userId of expiredUserIds) {
    // Sequential: each session invalidation writes its own auth_event row,
    // and concurrent fan-out would interleave those events.
    // eslint-disable-next-line no-await-in-loop
    await deps.invalidateUserSessions(userId);
  }

  return expiredUserIds.length;
}
