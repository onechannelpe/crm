import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { UserId } from "~/server/shared/ids";

export function createSearchCapacityGrantsRepo(db: Kysely<Database>) {
  return {
    insert(values: {
      user_id: UserId;
      amount: number;
      reason: string;
      actor_user_id: UserId;
    }): Promise<void> {
      return db
        .insertInto("search_capacity_grants")
        .values({ id: crypto.randomUUID(), ...values, created_at: Date.now() })
        .executeTakeFirstOrThrow()
        .then(() => undefined);
    },

    findByUserAndPeriod(
      userId: UserId,
      periodStart: string,
      periodEnd: string,
    ) {
      return db
        .selectFrom("search_capacity_grants")
        .selectAll()
        .where("user_id", "=", userId)
        .where("created_at", ">=", new Date(periodStart).getTime())
        .where(
          "created_at",
          "<=",
          new Date(periodEnd + "T23:59:59.999Z").getTime(),
        )
        .execute();
    },
  };
}

export function createSearchUsageReservationsRepo(db: Kysely<Database>) {
  return {
    insert(values: { user_id: UserId; amount: number; reason: string }) {
      const id = crypto.randomUUID();
      const now = Date.now();
      return db
        .insertInto("search_usage_reservations")
        .values({
          id,
          ...values,
          status: "pending",
          created_at: now,
          updated_at: now,
        })
        .returning("id")
        .executeTakeFirstOrThrow();
    },

    findById(id: string) {
      return db
        .selectFrom("search_usage_reservations")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    updateStatus(
      id: string,
      status: "committed" | "cancelled" | "expired",
    ): Promise<void> {
      return db
        .updateTable("search_usage_reservations")
        .set({ status, updated_at: Date.now() })
        .where("id", "=", id)
        .executeTakeFirst()
        .then(() => undefined);
    },

    findByUserAndPeriod(
      userId: UserId,
      periodStart: string,
      periodEnd: string,
    ) {
      return db
        .selectFrom("search_usage_reservations")
        .selectAll()
        .where("user_id", "=", userId)
        .where("created_at", ">=", new Date(periodStart).getTime())
        .where(
          "created_at",
          "<=",
          new Date(periodEnd + "T23:59:59.999Z").getTime(),
        )
        .execute();
    },
  };
}

export function createSearchUsageCommitsRepo(db: Kysely<Database>) {
  return {
    insert(values: { reservation_id: string; amount: number }): Promise<void> {
      return db
        .insertInto("search_usage_commits")
        .values({ id: crypto.randomUUID(), ...values, created_at: Date.now() })
        .executeTakeFirstOrThrow()
        .then(() => undefined);
    },

    findByReservation(reservationId: string) {
      return db
        .selectFrom("search_usage_commits")
        .selectAll()
        .where("reservation_id", "=", reservationId)
        .execute();
    },

    findByUserAndPeriod(
      userId: UserId,
      periodStart: string,
      periodEnd: string,
    ) {
      return db
        .selectFrom("search_usage_commits as c")
        .innerJoin("search_usage_reservations as r", "r.id", "c.reservation_id")
        .select(["c.id", "c.reservation_id", "c.amount", "c.created_at"])
        .where("r.user_id", "=", userId)
        .where("c.created_at", ">=", new Date(periodStart).getTime())
        .where(
          "c.created_at",
          "<=",
          new Date(periodEnd + "T23:59:59.999Z").getTime(),
        )
        .execute();
    },
  };
}

export function createLeadCapacityGrantsRepo(db: Kysely<Database>) {
  return {
    insert(values: {
      user_id: UserId;
      amount: number;
      reason: string;
      actor_user_id: UserId;
    }): Promise<void> {
      return db
        .insertInto("lead_capacity_grants")
        .values({ id: crypto.randomUUID(), ...values, created_at: Date.now() })
        .executeTakeFirstOrThrow()
        .then(() => undefined);
    },

    findByUserAndDate(userId: UserId, date: string) {
      return db
        .selectFrom("lead_capacity_grants")
        .selectAll()
        .where("user_id", "=", userId)
        .where("created_at", ">=", new Date(date).getTime())
        .where("created_at", "<=", new Date(date + "T23:59:59.999Z").getTime())
        .execute();
    },
  };
}

export function createLeadUsageReservationsRepo(db: Kysely<Database>) {
  return {
    insert(values: { user_id: UserId; amount: number; reason: string }) {
      const id = crypto.randomUUID();
      const now = Date.now();
      return db
        .insertInto("lead_usage_reservations")
        .values({
          id,
          ...values,
          status: "pending",
          created_at: now,
          updated_at: now,
        })
        .returning("id")
        .executeTakeFirstOrThrow();
    },

    findById(id: string) {
      return db
        .selectFrom("lead_usage_reservations")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    updateStatus(
      id: string,
      status: "committed" | "cancelled" | "expired",
    ): Promise<void> {
      return db
        .updateTable("lead_usage_reservations")
        .set({ status, updated_at: Date.now() })
        .where("id", "=", id)
        .executeTakeFirst()
        .then(() => undefined);
    },

    updateAmountAndStatus(
      id: string,
      amount: number,
      status: "committed" | "cancelled" | "expired",
    ): Promise<void> {
      return db
        .updateTable("lead_usage_reservations")
        .set({ amount, status, updated_at: Date.now() })
        .where("id", "=", id)
        .executeTakeFirst()
        .then(() => undefined);
    },

    findByUserAndDate(userId: UserId, date: string) {
      return db
        .selectFrom("lead_usage_reservations")
        .selectAll()
        .where("user_id", "=", userId)
        .where("created_at", ">=", new Date(date).getTime())
        .where("created_at", "<=", new Date(date + "T23:59:59.999Z").getTime())
        .execute();
    },
  };
}

export function createLeadUsageCommitsRepo(db: Kysely<Database>) {
  return {
    insert(values: { reservation_id: string; amount: number }): Promise<void> {
      return db
        .insertInto("lead_usage_commits")
        .values({ id: crypto.randomUUID(), ...values, created_at: Date.now() })
        .executeTakeFirstOrThrow()
        .then(() => undefined);
    },

    findByReservation(reservationId: string) {
      return db
        .selectFrom("lead_usage_commits")
        .selectAll()
        .where("reservation_id", "=", reservationId)
        .execute();
    },

    findByUserAndDate(userId: UserId, date: string) {
      return db
        .selectFrom("lead_usage_commits as c")
        .innerJoin("lead_usage_reservations as r", "r.id", "c.reservation_id")
        .select(["c.id", "c.reservation_id", "c.amount", "c.created_at"])
        .where("r.user_id", "=", userId)
        .where("c.created_at", ">=", new Date(date).getTime())
        .where(
          "c.created_at",
          "<=",
          new Date(date + "T23:59:59.999Z").getTime(),
        )
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
