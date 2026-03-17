import { sql, type Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { ScopeType } from "~/server/shared/pipeline-types";

export function createSearchPolicyDefaultsRepo(db: Kysely<Database>) {
  return {
    findForScope(scopeType: ScopeType, scopeId: number) {
      return db
        .selectFrom("search_policy_defaults")
        .selectAll()
        .where("scope_type", "=", scopeType)
        .where("scope_id", "=", scopeId)
        .executeTakeFirst();
    },

    listForScope(scopeType: ScopeType, scopeIds: number[]) {
      if (scopeIds.length === 0) {
        return Promise.resolve([]);
      }
      return db
        .selectFrom("search_policy_defaults")
        .selectAll()
        .where("scope_type", "=", scopeType)
        .where("scope_id", "in", scopeIds)
        .execute();
    },

    async upsert(values: {
      scope_type: ScopeType;
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

    listActiveForUsers(userIds: number[], now: number) {
      if (userIds.length === 0) {
        return Promise.resolve([]);
      }
      return db
        .selectFrom("search_policy_overrides")
        .selectAll()
        .where("user_id", "in", userIds)
        .where("effective_from", "<=", now)
        .where((eb) =>
          eb.or([eb("expires_at", "is", null), eb("expires_at", ">", now)]),
        )
        .orderBy("user_id", "asc")
        .orderBy("created_at", "desc")
        .execute();
    },

    async replaceForUser(values: {
      user_id: number;
      search_limit: number;
      effective_from: number;
      expires_at: number | null;
      set_by_user_id: number;
    }) {
      return db.transaction().execute(async (trx) => {
        await trx
          .deleteFrom("search_policy_overrides")
          .where("user_id", "=", values.user_id)
          .execute();
        return trx
          .insertInto("search_policy_overrides")
          .values({ ...values, created_at: Date.now() })
          .executeTakeFirstOrThrow();
      });
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

    listByUsersAndPeriod(userIds: number[], periodStart: string) {
      if (userIds.length === 0) {
        return Promise.resolve([]);
      }
      return db
        .selectFrom("search_allowance_ledger")
        .selectAll()
        .where("period_start", "=", periodStart)
        .where("user_id", "in", userIds)
        .execute();
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

    async reserveUsageIfAvailable(id: number, amount: number) {
      const result = await db
        .updateTable("search_allowance_ledger")
        .set((eb) => ({
          used_amount: eb("used_amount", "+", amount),
          updated_at: Date.now(),
        }))
        .where("id", "=", id)
        .where(
          sql<boolean>`(used_amount + ${amount}) <= (base_limit + extra_granted)`,
        )
        .executeTakeFirst();
      return Number(result.numUpdatedRows) > 0;
    },

    async decrementUsageIfAvailable(id: number, amount: number) {
      const result = await db
        .updateTable("search_allowance_ledger")
        .set((eb) => ({
          used_amount: eb("used_amount", "-", amount),
          updated_at: Date.now(),
        }))
        .where("id", "=", id)
        .where("used_amount", ">=", amount)
        .executeTakeFirst();
      return Number(result.numUpdatedRows) > 0;
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
