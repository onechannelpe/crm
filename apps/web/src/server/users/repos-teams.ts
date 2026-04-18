import type { Kysely, Selectable } from "kysely";

import type { Role } from "~/lib/auth/access/rbac";
import type { Database, TeamsTable } from "~/lib/db/types";
import {
  asBranchId,
  asTeamId,
  asUserId,
  type BranchId,
  type TeamId,
  type UserId,
} from "~/server/shared/ids";

export function createTeamsRepo(db: Kysely<Database>) {
  return {
    findByBranch(branchId: BranchId) {
      return db
        .selectFrom("teams")
        .selectAll()
        .where("branch_id", "=", branchId)
        .orderBy("name", "asc")
        .execute() as Promise<
        Array<
          Omit<Selectable<TeamsTable>, "id" | "branch_id" | "supervisor_id"> & {
            id: TeamId;
            branch_id: BranchId;
            supervisor_id: UserId | null;
          }
        >
      >;
    },

    findByIdWithSupervisor(id: TeamId) {
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
        .executeTakeFirst() as Promise<
        | {
            id: TeamId;
            name: string;
            branch_id: BranchId;
            supervisor_id: UserId | null;
            supervisor_names: string | null;
            supervisor_first_surname: string | null;
            supervisor_role: Role | null;
            supervisor_branch_id: BranchId | null;
          }
        | undefined
      >;
    },

    findBySupervisorId(supervisorId: UserId) {
      return db
        .selectFrom("teams")
        .selectAll()
        .where("supervisor_id", "=", supervisorId)
        .orderBy("id", "asc")
        .executeTakeFirst() as Promise<
        | (Omit<
            Selectable<TeamsTable>,
            "id" | "branch_id" | "supervisor_id"
          > & {
            id: TeamId;
            branch_id: BranchId;
            supervisor_id: UserId | null;
          })
        | undefined
      >;
    },
  };
}
