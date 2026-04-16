import { shortName } from "~/lib/users/display-name";
import { createUsersRepo } from "~/server/users/repos-users";

import type { DatabaseExecutor } from "../../shared/db-executor";
import type {
  PipelineUserRepository,
  PipelineUserWithName,
} from "../application/ports/user-repository";
import type { AssignableExecutivesScope } from "../ports/lead-user-scope-repository";

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
    async isExecutiveAssignable(
      scope: AssignableExecutivesScope,
      executiveId: number,
    ): Promise<boolean> {
      const user = await users.findById(executiveId);
      if (!user) {
        return false;
      }

      if (user.role !== "executive") {
        return false;
      }
      if (user.is_active !== 1 || user.onboarding_completed_at == null) {
        return false;
      }
      if (
        scope.actorRole !== "superuser" &&
        user.branch_id !== scope.actorBranchId
      ) {
        return false;
      }

      return true;
    },
    async listAssignableExecutives(
      input: AssignableExecutivesScope,
      options?: { search?: string; limit?: number },
    ): Promise<PipelineUserWithName[]> {
      const limit = options?.limit && options.limit > 0 ? options.limit : 50;
      const rows = await users.findAssignableExecutives({
        branchId:
          input.actorRole === "superuser" ? undefined : input.actorBranchId,
        search: options?.search,
        limit,
      });

      return rows.map((user) => ({
        id: user.id,
        fullName: shortName(user),
      }));
    },
  };
}
