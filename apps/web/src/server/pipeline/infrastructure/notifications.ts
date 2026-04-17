import { createAppNotificationRepo } from "~/server/notifications/repos/app-notification";
import { createUsersRepo } from "~/server/users/repos-users";

import { createAppNotificationCenter } from "../../notifications/app-center-service";
import type { DatabaseExecutor } from "../../shared/db-executor";

export function createPipelineNotificationCenter(executor: DatabaseExecutor) {
  return createAppNotificationCenter({
    repos: {
      appNotifications: createAppNotificationRepo(executor),
      users: createUsersRepo(executor),
    },
  });
}
