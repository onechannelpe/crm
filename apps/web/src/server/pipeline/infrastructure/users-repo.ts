import { shortName } from "~/lib/users/display-name";
import { createUsersRepo } from "~/server/users/repos-users";

import type { DatabaseExecutor } from "../../shared/db-executor";
import type {
  PipelineUserRepository,
  PipelineUserWithName,
} from "../application/ports/user-repository";

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
    async findByIds(ids): Promise<PipelineUserWithName[]> {
      const rows = await users.findByIds(ids);
      return rows.map((user) => ({
        id: user.id,
        fullName: shortName(user),
      }));
    },
  };
}
