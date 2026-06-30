import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { BranchId, UserId } from "~/server/shared/ids";

export function createBranchSupervisorsRepo(db: Kysely<Database>) {
  return {
    async findByBranch(branchId: BranchId) {
      return db
        .selectFrom("branch_supervisors")
        .innerJoin("users", "users.id", "branch_supervisors.user_id")
        .select([
          "branch_supervisors.id",
          "branch_supervisors.user_id",
          "users.names",
        ])
        .where("branch_supervisors.branch_id", "=", branchId)
        .orderBy("branch_supervisors.id", "asc")
        .execute();
    },

    async findByUserId(userId: UserId) {
      return db
        .selectFrom("branch_supervisors")
        .select(["branch_id"])
        .where("user_id", "=", userId)
        .execute();
    },

    async assign(branchId: BranchId, userId: UserId, now: Date) {
      await db
        .insertInto("branch_supervisors")
        .values({
          branch_id: branchId,
          user_id: userId,
          created_at: now,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();
    },

    async isSupervisor(branchId: BranchId, userId: UserId): Promise<boolean> {
      const row = await db
        .selectFrom("branch_supervisors")
        .select(["id"])
        .where("branch_id", "=", branchId)
        .where("user_id", "=", userId)
        .executeTakeFirst();

      return !!row;
    },
  };
}

export type BranchSupervisorsRepo = ReturnType<
  typeof createBranchSupervisorsRepo
>;
