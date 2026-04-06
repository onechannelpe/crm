import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { CapacityTeam } from "../application/actor-scope";

function toCapacityTeam(team: {
  id: number;
  name: string;
  branch_id: number;
  supervisor_id: number | null;
}): CapacityTeam {
  return {
    id: team.id,
    name: team.name,
    branchId: team.branch_id,
    supervisorId: team.supervisor_id,
  };
}

export function createCapacityTeamsRepo(db: DatabaseExecutor) {
  return {
    findByBranch(branchId: number) {
      return db
        .selectFrom("teams")
        .selectAll()
        .where("branch_id", "=", branchId)
        .orderBy("name", "asc")
        .execute()
        .then((teams) => teams.map(toCapacityTeam));
    },

    findByIdWithSupervisor(id: number) {
      return db
        .selectFrom("teams")
        .select([
          "teams.id",
          "teams.name",
          "teams.branch_id",
          "teams.supervisor_id",
        ])
        .where("teams.id", "=", id)
        .executeTakeFirst()
        .then((team) => (team ? toCapacityTeam(team) : undefined));
    },

    findBySupervisorId(supervisorId: number) {
      return db
        .selectFrom("teams")
        .selectAll()
        .where("supervisor_id", "=", supervisorId)
        .orderBy("id", "asc")
        .executeTakeFirst()
        .then((team) => (team ? toCapacityTeam(team) : undefined));
    },
  };
}

export type CapacityTeamsRepo = ReturnType<typeof createCapacityTeamsRepo>;
