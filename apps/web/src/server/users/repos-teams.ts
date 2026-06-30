import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { BranchId, TeamId } from "~/server/shared/ids";

export function createTeamsRepo(db: DatabaseExecutor) {
  return {
    findByBranch(branchId: BranchId) {
      return db
        .selectFrom("teams")
        .selectAll()
        .where("branch_id", "=", branchId)
        .orderBy("name", "asc")
        .execute();
    },

    findById(id: TeamId) {
      return db
        .selectFrom("teams")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },
  };
}

export type TeamsRepo = ReturnType<typeof createTeamsRepo>;
