import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { BranchId, TeamId } from "~/server/shared/ids";

import type { CapacityTeam } from "../application/actor-scope";

function toCapacityTeam(team: {
  id: TeamId;
  name: string;
  branch_id: BranchId;
}): CapacityTeam {
  return {
    id: team.id,
    name: team.name,
    branchId: team.branch_id,
  };
}

export function createCapacityTeamsRepo(db: DatabaseExecutor) {
  return {
    findByBranch(branchId: BranchId) {
      return db
        .selectFrom("teams")
        .selectAll()
        .where("branch_id", "=", branchId)
        .orderBy("name", "asc")
        .execute()
        .then((teams) => teams.map(toCapacityTeam));
    },

    findById(id: TeamId) {
      return db
        .selectFrom("teams")
        .select(["teams.id", "teams.name", "teams.branch_id"])
        .where("teams.id", "=", id)
        .executeTakeFirst()
        .then((team) => (team ? toCapacityTeam(team) : undefined));
    },
  };
}

export type CapacityTeamsRepo = ReturnType<typeof createCapacityTeamsRepo>;
