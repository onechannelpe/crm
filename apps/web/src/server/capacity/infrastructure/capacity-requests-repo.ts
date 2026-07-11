import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { BranchId, CapacityRequestId, UserId } from "~/server/shared/ids";

export function createCapacityRequestsRepo(db: Kysely<Database>) {
  return {
    create(values: {
      user_id: UserId;
      kind: "search_extra" | "lead_refill_extra";
      status: "pending";
      requested_amount: number;
      reason: string;
    }) {
      const now = new Date();
      return db
        .insertInto("capacity_requests")
        .values({
          ...values,
          decision_note: null,
          reviewer_user_id: null,
          created_at: now,
          updated_at: now,
          decided_at: null,
        })
        .executeTakeFirstOrThrow();
    },

    findById(id: CapacityRequestId) {
      return db
        .selectFrom("capacity_requests")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    listByUser(userId: UserId) {
      return db
        .selectFrom("capacity_requests")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "desc")
        .execute();
    },

    listPendingByBranch(branchId: BranchId) {
      return db
        .selectFrom("capacity_requests")
        .innerJoin("users", "users.id", "capacity_requests.user_id")
        .select([
          "capacity_requests.id",
          "capacity_requests.user_id",
          "capacity_requests.kind",
          "capacity_requests.status",
          "capacity_requests.requested_amount",
          "capacity_requests.reason",
          "capacity_requests.decision_note",
          "capacity_requests.reviewer_user_id",
          "capacity_requests.created_at",
          "capacity_requests.updated_at",
          "capacity_requests.decided_at",
          "users.names",
          "users.first_surname",
          "users.second_surname",
          "users.team_id",
          "users.branch_id",
        ])
        .where("users.branch_id", "=", branchId)
        .where("capacity_requests.status", "=", "pending")
        .orderBy("capacity_requests.created_at", "desc")
        .execute();
    },

    markApproved(
      id: CapacityRequestId,
      reviewerUserId: UserId,
      decisionNote: string | null,
    ) {
      const now = new Date();
      return db
        .updateTable("capacity_requests")
        .set({
          status: "approved",
          reviewer_user_id: reviewerUserId,
          decision_note: decisionNote,
          decided_at: now,
          updated_at: now,
        })
        .where("id", "=", id)
        .where("status", "=", "pending")
        .executeTakeFirst();
    },

    markRejected(
      id: CapacityRequestId,
      reviewerUserId: UserId,
      decisionNote: string | null,
    ) {
      const now = new Date();
      return db
        .updateTable("capacity_requests")
        .set({
          status: "rejected",
          reviewer_user_id: reviewerUserId,
          decision_note: decisionNote,
          decided_at: now,
          updated_at: now,
        })
        .where("id", "=", id)
        .where("status", "=", "pending")
        .executeTakeFirst();
    },
  };
}

export type CapacityRequestsRepo = ReturnType<
  typeof createCapacityRequestsRepo
>;
