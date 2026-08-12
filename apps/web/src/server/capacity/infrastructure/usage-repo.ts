import type { Kysely } from "kysely";

import type {
  LeadReservationId,
  SearchReservationId,
  UserId,
} from "~/domain/ids";
import type { InstantRange } from "~/domain/time/app-time";
import type { Database } from "~/server/platform/database/types";

export function createSearchCapacityGrantsRepo(db: Kysely<Database>) {
  return {
    async insert(values: {
      user_id: UserId;
      amount: number;
      reason: string;
      actor_user_id: UserId;
      created_at: Date;
    }): Promise<void> {
      await db
        .insertInto("search_capacity_grants")
        .values(values)
        .executeTakeFirstOrThrow();
    },

    findByUserAndRange(userId: UserId, range: InstantRange) {
      return db
        .selectFrom("search_capacity_grants")
        .selectAll()
        .where("user_id", "=", userId)
        .where("created_at", ">=", range.start)
        .where("created_at", "<", range.endExclusive)
        .execute();
    },
  };
}

export function createSearchUsageReservationsRepo(db: Kysely<Database>) {
  return {
    insert(values: {
      user_id: UserId;
      amount: number;
      reason: string;
      created_at: Date;
      updated_at: Date;
    }) {
      return db
        .insertInto("search_usage_reservations")
        .values({ ...values, status: "pending" })
        .returning("id")
        .executeTakeFirstOrThrow();
    },

    findById(id: SearchReservationId) {
      return db
        .selectFrom("search_usage_reservations")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    async updateStatus(
      id: SearchReservationId,
      status: "committed" | "cancelled" | "expired",
      updatedAt: Date,
    ): Promise<void> {
      await db
        .updateTable("search_usage_reservations")
        .set({ status, updated_at: updatedAt })
        .where("id", "=", id)
        .executeTakeFirst();
    },

    // Search consumes the full reservation, but this method keeps both usage
    // repositories on the same interface.
    async updateAmountAndStatus(
      id: SearchReservationId,
      amount: number,
      status: "committed" | "cancelled" | "expired",
      updatedAt: Date,
    ): Promise<void> {
      await db
        .updateTable("search_usage_reservations")
        .set({ amount, status, updated_at: updatedAt })
        .where("id", "=", id)
        .executeTakeFirst();
    },

    findByUserAndRange(userId: UserId, range: InstantRange) {
      return db
        .selectFrom("search_usage_reservations")
        .selectAll()
        .where("user_id", "=", userId)
        .where("created_at", ">=", range.start)
        .where("created_at", "<", range.endExclusive)
        .execute();
    },
  };
}

export function createSearchUsageCommitsRepo(db: Kysely<Database>) {
  return {
    async insert(values: {
      reservation_id: SearchReservationId;
      amount: number;
      created_at: Date;
    }): Promise<void> {
      await db
        .insertInto("search_usage_commits")
        .values(values)
        .executeTakeFirstOrThrow();
    },

    findByReservation(reservationId: SearchReservationId) {
      return db
        .selectFrom("search_usage_commits")
        .selectAll()
        .where("reservation_id", "=", reservationId)
        .execute();
    },

    findByUserAndRange(userId: UserId, range: InstantRange) {
      return db
        .selectFrom("search_usage_commits as c")
        .innerJoin("search_usage_reservations as r", "r.id", "c.reservation_id")
        .select(["c.id", "c.reservation_id", "c.amount", "c.created_at"])
        .where("r.user_id", "=", userId)
        .where("c.created_at", ">=", range.start)
        .where("c.created_at", "<", range.endExclusive)
        .execute();
    },
  };
}

export function createLeadCapacityGrantsRepo(db: Kysely<Database>) {
  return {
    async insert(values: {
      user_id: UserId;
      amount: number;
      reason: string;
      actor_user_id: UserId;
      created_at: Date;
    }): Promise<void> {
      await db
        .insertInto("lead_capacity_grants")
        .values(values)
        .executeTakeFirstOrThrow();
    },

    findByUserAndRange(userId: UserId, range: InstantRange) {
      return db
        .selectFrom("lead_capacity_grants")
        .selectAll()
        .where("user_id", "=", userId)
        .where("created_at", ">=", range.start)
        .where("created_at", "<", range.endExclusive)
        .execute();
    },
  };
}

export function createLeadUsageReservationsRepo(db: Kysely<Database>) {
  return {
    insert(values: {
      user_id: UserId;
      amount: number;
      reason: string;
      created_at: Date;
      updated_at: Date;
    }) {
      return db
        .insertInto("lead_usage_reservations")
        .values({ ...values, status: "pending" })
        .returning("id")
        .executeTakeFirstOrThrow();
    },

    findById(id: LeadReservationId) {
      return db
        .selectFrom("lead_usage_reservations")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    async updateStatus(
      id: LeadReservationId,
      status: "committed" | "cancelled" | "expired",
      updatedAt: Date,
    ): Promise<void> {
      await db
        .updateTable("lead_usage_reservations")
        .set({ status, updated_at: updatedAt })
        .where("id", "=", id)
        .executeTakeFirst();
    },

    async updateAmountAndStatus(
      id: LeadReservationId,
      amount: number,
      status: "committed" | "cancelled" | "expired",
      updatedAt: Date,
    ): Promise<void> {
      await db
        .updateTable("lead_usage_reservations")
        .set({ amount, status, updated_at: updatedAt })
        .where("id", "=", id)
        .executeTakeFirst();
    },

    findByUserAndRange(userId: UserId, range: InstantRange) {
      return db
        .selectFrom("lead_usage_reservations")
        .selectAll()
        .where("user_id", "=", userId)
        .where("created_at", ">=", range.start)
        .where("created_at", "<", range.endExclusive)
        .execute();
    },
  };
}

export function createLeadUsageCommitsRepo(db: Kysely<Database>) {
  return {
    async insert(values: {
      reservation_id: LeadReservationId;
      amount: number;
      created_at: Date;
    }): Promise<void> {
      await db
        .insertInto("lead_usage_commits")
        .values(values)
        .executeTakeFirstOrThrow();
    },

    findByReservation(reservationId: LeadReservationId) {
      return db
        .selectFrom("lead_usage_commits")
        .selectAll()
        .where("reservation_id", "=", reservationId)
        .execute();
    },

    findByUserAndRange(userId: UserId, range: InstantRange) {
      return db
        .selectFrom("lead_usage_commits as c")
        .innerJoin("lead_usage_reservations as r", "r.id", "c.reservation_id")
        .select(["c.id", "c.reservation_id", "c.amount", "c.created_at"])
        .where("r.user_id", "=", userId)
        .where("c.created_at", ">=", range.start)
        .where("c.created_at", "<", range.endExclusive)
        .execute();
    },
  };
}

export type SearchCapacityGrantsRepo = ReturnType<
  typeof createSearchCapacityGrantsRepo
>;
export type SearchUsageReservationsRepo = ReturnType<
  typeof createSearchUsageReservationsRepo
>;
export type SearchUsageCommitsRepo = ReturnType<
  typeof createSearchUsageCommitsRepo
>;
export type LeadCapacityGrantsRepo = ReturnType<
  typeof createLeadCapacityGrantsRepo
>;
export type LeadUsageReservationsRepo = ReturnType<
  typeof createLeadUsageReservationsRepo
>;
export type LeadUsageCommitsRepo = ReturnType<
  typeof createLeadUsageCommitsRepo
>;
