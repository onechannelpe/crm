import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

export function createLeadPolicyDefaultsRepo(db: Kysely<Database>) {
  return {
    findForScope(scopeType: "branch" | "team", scopeId: number) {
      return db
        .selectFrom("lead_policy_defaults")
        .selectAll()
        .where("scope_type", "=", scopeType)
        .where("scope_id", "=", scopeId)
        .executeTakeFirst();
    },

    async upsert(values: {
      scope_type: "branch" | "team";
      scope_id: number;
      active_buffer_target: number;
      daily_refill_limit: number;
    }) {
      const existing = await this.findForScope(values.scope_type, values.scope_id);
      const now = Date.now();
      if (existing) {
        return db
          .updateTable("lead_policy_defaults")
          .set({ ...values, updated_at: now })
          .where("id", "=", existing.id)
          .executeTakeFirst();
      }
      return db
        .insertInto("lead_policy_defaults")
        .values({ ...values, created_at: now, updated_at: now })
        .executeTakeFirstOrThrow();
    },
  };
}

export function createLeadPolicyOverridesRepo(db: Kysely<Database>) {
  return {
    findActiveForUser(userId: number, now: number) {
      return db
        .selectFrom("lead_policy_overrides")
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
      active_buffer_target: number;
      daily_refill_limit: number;
      effective_from: number;
      expires_at: number | null;
      set_by_user_id: number;
    }) {
      await db
        .deleteFrom("lead_policy_overrides")
        .where("user_id", "=", values.user_id)
        .execute();
      return db
        .insertInto("lead_policy_overrides")
        .values({ ...values, created_at: Date.now() })
        .executeTakeFirstOrThrow();
    },
  };
}

export function createLeadRefillLedgerRepo(db: Kysely<Database>) {
  return {
    findByUserAndDate(userId: number, date: string) {
      return db
        .selectFrom("lead_refill_ledger")
        .selectAll()
        .where("user_id", "=", userId)
        .where("date", "=", date)
        .executeTakeFirst();
    },

    create(values: { user_id: number; date: string; base_limit: number }) {
      const now = Date.now();
      return db
        .insertInto("lead_refill_ledger")
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
        .updateTable("lead_refill_ledger")
        .set({ base_limit: baseLimit, updated_at: Date.now() })
        .where("id", "=", id)
        .execute();
    },

    incrementUsage(id: number, amount: number) {
      return db
        .updateTable("lead_refill_ledger")
        .set((eb) => ({
          used_amount: eb("used_amount", "+", amount),
          updated_at: Date.now(),
        }))
        .where("id", "=", id)
        .execute();
    },

    decrementUsage(id: number, amount: number) {
      return db
        .updateTable("lead_refill_ledger")
        .set((eb) => ({
          used_amount: eb("used_amount", "-", amount),
          updated_at: Date.now(),
        }))
        .where("id", "=", id)
        .execute();
    },

    incrementExtra(id: number, amount: number) {
      return db
        .updateTable("lead_refill_ledger")
        .set((eb) => ({
          extra_granted: eb("extra_granted", "+", amount),
          updated_at: Date.now(),
        }))
        .where("id", "=", id)
        .execute();
    },
  };
}
