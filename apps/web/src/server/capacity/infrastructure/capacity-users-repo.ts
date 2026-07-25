import type { Selectable } from "kysely";

import type { BranchId, UserId } from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { UsersTable } from "~/server/platform/database/types";

import type { CapacityUser } from "../application/actor-scope";

type UserRow = Selectable<UsersTable>;

function toCapacityUser(user: UserRow): CapacityUser {
  return {
    id: user.id,
    role: user.role,
    branchId: user.branch_id,
    teamId: user.team_id,
    email: user.email,
    names: user.names,
    firstSurname: user.first_surname,
    secondSurname: user.second_surname,
    executiveCategory: user.executive_category,
  };
}

export function createCapacityUsersRepo(db: DatabaseExecutor) {
  return {
    findById(id: UserId) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst()
        .then((user) => (user ? toCapacityUser(user) : undefined));
    },

    findByBranchIncludingInactive(branchId: BranchId) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("branch_id", "=", branchId)
        .execute()
        .then((users) => users.map(toCapacityUser));
    },

    findByBranch(branchId: BranchId) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("branch_id", "=", branchId)
        .where("is_active", "=", true)
        .execute()
        .then((users) => users.map(toCapacityUser));
    },

    findAllActive() {
      return db
        .selectFrom("users")
        .selectAll()
        .where("is_active", "=", true)
        .execute()
        .then((users) => users.map(toCapacityUser));
    },
  };
}

export type CapacityUsersRepo = ReturnType<typeof createCapacityUsersRepo>;
