import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

export function createTeamsRepo(db: Kysely<Database>) {
  return {
    findByBranch(branchId: string) {
      return db
        .selectFrom("teams")
        .selectAll()
        .where("branch_id", "=", branchId)
        .orderBy("name", "asc")
        .execute();
    },

    findByIdWithSupervisor(id: string) {
      return db
        .selectFrom("teams")
        .leftJoin(
          "users as supervisors",
          "supervisors.id",
          "teams.supervisor_id",
        )
        .select([
          "teams.id",
          "teams.name",
          "teams.branch_id",
          "teams.supervisor_id",
          "supervisors.names as supervisor_names",
          "supervisors.first_surname as supervisor_first_surname",
          "supervisors.role as supervisor_role",
          "supervisors.branch_id as supervisor_branch_id",
        ])
        .where("teams.id", "=", id)
        .executeTakeFirst();
    },

    findBySupervisorId(supervisorId: string) {
      return db
        .selectFrom("teams")
        .selectAll()
        .where("supervisor_id", "=", supervisorId)
        .orderBy("id", "asc")
        .executeTakeFirst();
    },
  };
}
