import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/schema";

export function createTeamsRepo(db: Kysely<Database>) {
  return {
    findByBranch(branchId: number) {
      return db
        .selectFrom("teams")
        .selectAll()
        .where("branch_id", "=", branchId)
        .orderBy("name", "asc")
        .execute();
    },

    findByIdWithSupervisor(id: number) {
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
          "supervisors.full_name as supervisor_name",
          "supervisors.role as supervisor_role",
          "supervisors.branch_id as supervisor_branch_id",
        ])
        .where("teams.id", "=", id)
        .executeTakeFirst();
    },

    findBySupervisorId(supervisorId: number) {
      return db
        .selectFrom("teams")
        .selectAll()
        .where("supervisor_id", "=", supervisorId)
        .orderBy("id", "asc")
        .executeTakeFirst();
    },
  };
}
