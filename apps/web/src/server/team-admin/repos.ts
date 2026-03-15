import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

export function createAllowanceRequestsRepo(db: Kysely<Database>) {
  return {
    create(values: {
      user_id: number;
      kind: "search_extra" | "lead_refill_extra";
      status: "pending";
      requested_amount: number;
      reason: string;
    }) {
      const now = Date.now();
      return db
        .insertInto("allowance_requests")
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

    findById(id: number) {
      return db
        .selectFrom("allowance_requests")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    listPendingByBranch(branchId: number) {
      return db
        .selectFrom("allowance_requests")
        .innerJoin("users", "users.id", "allowance_requests.user_id")
        .select([
          "allowance_requests.id",
          "allowance_requests.user_id",
          "allowance_requests.kind",
          "allowance_requests.status",
          "allowance_requests.requested_amount",
          "allowance_requests.reason",
          "allowance_requests.decision_note",
          "allowance_requests.reviewer_user_id",
          "allowance_requests.created_at",
          "allowance_requests.updated_at",
          "allowance_requests.decided_at",
          "users.names",
          "users.first_surname",
          "users.second_surname",
          "users.team_id",
          "users.branch_id",
        ])
        .where("users.branch_id", "=", branchId)
        .where("allowance_requests.status", "=", "pending")
        .orderBy("allowance_requests.created_at", "desc")
        .execute();
    },

    listByUser(userId: number) {
      return db
        .selectFrom("allowance_requests")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "desc")
        .execute();
    },

    markApproved(id: number, reviewerUserId: number, decisionNote: string | null) {
      const now = Date.now();
      return db
        .updateTable("allowance_requests")
        .set({
          status: "approved",
          reviewer_user_id: reviewerUserId,
          decision_note: decisionNote,
          decided_at: now,
          updated_at: now,
        })
        .where("id", "=", id)
        .execute();
    },

    markRejected(id: number, reviewerUserId: number, decisionNote: string | null) {
      const now = Date.now();
      return db
        .updateTable("allowance_requests")
        .set({
          status: "rejected",
          reviewer_user_id: reviewerUserId,
          decision_note: decisionNote,
          decided_at: now,
          updated_at: now,
        })
        .where("id", "=", id)
        .execute();
    },
  };
}
