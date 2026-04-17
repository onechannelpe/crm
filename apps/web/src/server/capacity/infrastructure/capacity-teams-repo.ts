import type { DatabaseExecutor } from "~/server/shared/db-executor";
import {
  asBranchId,
  asTeamId,
  asUserId,
  type BranchId,
  type TeamId,
  type UserId,
} from "~/server/shared/ids";

import type { CapacityTeam } from "../application/actor-scope";

function toCapacityTeam(team: {
  id: string;
  name: string;
  branch_id: string;
  supervisor_id: string | null;
}): CapacityTeam {
  return {
    id: asTeamId(team.id),
    name: team.name,
    branchId: asBranchId(team.branch_id),
    supervisorId:
      team.supervisor_id === null ? null : asUserId(team.supervisor_id),
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

    findByIdWithSupervisor(id: TeamId) {
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

    findBySupervisorId(supervisorId: UserId) {
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
