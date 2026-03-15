import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

export function createSearchPolicyDefaultsRepo(db: Kysely<Database>) {
  return {
    findForScope(scopeType: "branch" | "team", scopeId: number) {
      return db
        .selectFrom("search_policy_defaults")
        .selectAll()
        .where("scope_type", "=", scopeType)
        .where("scope_id", "=", scopeId)
        .executeTakeFirst();
    },

    async upsert(values: {
      scope_type: "branch" | "team";
      scope_id: number;
      period_type: "month";
      search_limit: number;
    }) {
      const existing = await this.findForScope(
        values.scope_type,
        values.scope_id,
      );
      const now = Date.now();
      if (existing) {
        return db
          .updateTable("search_policy_defaults")
          .set({ ...values, updated_at: now })
          .where("id", "=", existing.id)
          .executeTakeFirst();
      }
      return db
        .insertInto("search_policy_defaults")
        .values({ ...values, created_at: now, updated_at: now })
        .executeTakeFirstOrThrow();
    },
  };
}

export function createSearchPolicyOverridesRepo(db: Kysely<Database>) {
  return {
    findActiveForUser(userId: number, now: number) {
      return db
        .selectFrom("search_policy_overrides")
        .selectAll()
        .where("user_id", "=", userId)
        .where("effective_from", "<=", now)
        .where((eb) =>
          eb.or([eb("expires_at", "is", null), eb("expires_at", ">", now)]),
        )
        .orderBy("created_at", "desc")
        .executeTakeFirst();
    },

    async replaceForUser(values: {
      user_id: number;
      search_limit: number;
      effective_from: number;
      expires_at: number | null;
      set_by_user_id: number;
    }) {
      await db
        .deleteFrom("search_policy_overrides")
        .where("user_id", "=", values.user_id)
        .execute();
      return db
        .insertInto("search_policy_overrides")
        .values({ ...values, created_at: Date.now() })
        .executeTakeFirstOrThrow();
    },
  };
}

export function createSearchAllowanceLedgerRepo(db: Kysely<Database>) {
  return {
    findByUserAndPeriod(userId: number, periodStart: string) {
      return db
        .selectFrom("search_allowance_ledger")
        .selectAll()
        .where("user_id", "=", userId)
        .where("period_start", "=", periodStart)
        .executeTakeFirst();
    },

    create(values: {
      user_id: number;
      period_start: string;
      period_end: string;
      base_limit: number;
    }) {
      const now = Date.now();
      return db
        .insertInto("search_allowance_ledger")
        .values({
          ...values,
          extra_granted: 0,
          used_amount: 0,
          created_at: now,
          updated_at: now,
        })
        .executeTakeFirstOrThrow();
    },

    syncBaseLimit(id: number, baseLimit: number) {
      return db
        .updateTable("search_allowance_ledger")
        .set({ base_limit: baseLimit, updated_at: Date.now() })
        .where("id", "=", id)
        .execute();
    },

    incrementUsage(id: number, amount: number) {
      return db
        .updateTable("search_allowance_ledger")
        .set((eb) => ({
          used_amount: eb("used_amount", "+", amount),
          updated_at: Date.now(),
        }))
        .where("id", "=", id)
        .execute();
    },

    decrementUsage(id: number, amount: number) {
      return db
        .updateTable("search_allowance_ledger")
        .set((eb) => ({
          used_amount: eb("used_amount", "-", amount),
          updated_at: Date.now(),
        }))
        .where("id", "=", id)
        .execute();
    },

    incrementExtra(id: number, amount: number) {
      return db
        .updateTable("search_allowance_ledger")
        .set((eb) => ({
          extra_granted: eb("extra_granted", "+", amount),
          updated_at: Date.now(),
        }))
        .where("id", "=", id)
        .execute();
    },
  };
}
