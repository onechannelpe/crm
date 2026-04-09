import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createUsersRepo } from "~/server/users/repos-users";

export function createAuthUsersRepo(
  executor: DatabaseExecutor,
): ReturnType<typeof createUsersRepo> {
  return createUsersRepo(executor);
}
