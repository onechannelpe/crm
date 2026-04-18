import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import {
  asBranchId,
  asTeamId,
  asUserId,
  type BranchId,
  type UserId,
} from "~/server/shared/ids";

export function createCapacityRequestsRepo(db: Kysely<Database>) {
  return {
    create(values: {
      user_id: UserId;
      kind: "search_extra" | "lead_refill_extra";
      status: "pending";
      requested_amount: number;
      reason: string;
    }) {
      const now = Date.now();
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

    findById(id: number) {
      return db
        .selectFrom("capacity_requests")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst()
        .then((row) =>
          row
            ? {
                ...row,
                user_id: asUserId(row.user_id),
                reviewer_user_id:
                  row.reviewer_user_id === null
                    ? null
                    : asUserId(row.reviewer_user_id),
              }
            : undefined,
        );
    },

    listByUser(userId: UserId) {
      return db
        .selectFrom("capacity_requests")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "desc")
        .execute()
        .then((rows) =>
          rows.map((row) => ({
            ...row,
            user_id: asUserId(row.user_id),
            reviewer_user_id:
              row.reviewer_user_id === null
                ? null
                : asUserId(row.reviewer_user_id),
          })),
        );
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
        .execute()
        .then((rows) =>
          rows.map((row) => ({
            ...row,
            user_id: asUserId(row.user_id),
            reviewer_user_id:
              row.reviewer_user_id === null
                ? null
                : asUserId(row.reviewer_user_id),
            team_id: row.team_id === null ? null : asTeamId(row.team_id),
            branch_id: asBranchId(row.branch_id),
          })),
        );
    },

    markApproved(
      id: number,
      reviewerUserId: UserId,
      decisionNote: string | null,
    ) {
      const now = Date.now();
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
      id: number,
      reviewerUserId: UserId,
      decisionNote: string | null,
    ) {
      const now = Date.now();
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
