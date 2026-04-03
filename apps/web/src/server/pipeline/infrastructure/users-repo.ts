import { createUsersRepo } from "~/server/users/repos-users";

import type { DatabaseExecutor } from "../../shared/db-executor";
import type { PipelineUserRepository } from "../application/ports/user-repository";

export function createPipelineUsersRepo(
  executor: DatabaseExecutor,
): PipelineUserRepository {
  const users = createUsersRepo(executor);

  return {
    async findById(id) {
      const user = await users.findById(id);
      if (!user) {
        return undefined;
      }

      return {
        id: user.id,
        isActive: user.is_active === 1,
      };
    },
  };
}
