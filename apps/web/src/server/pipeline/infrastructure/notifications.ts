import { db } from "~/lib/db/db";
import { createAppNotificationsRepo } from "~/server/notifications/repos-app-notifications";
import { createUsersRepo } from "~/server/users/repos-users";

import { createAppNotificationCenter } from "../../notifications/app-center-service";
import type { DatabaseExecutor } from "../../shared/db-executor";

export function createPipelineNotificationCenter(
  executor: DatabaseExecutor = db,
) {
  return createAppNotificationCenter({
    repos: {
      appNotifications: createAppNotificationsRepo(executor),
      users: createUsersRepo(executor),
    },
  });
}
