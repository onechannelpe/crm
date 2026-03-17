import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

type DefaultScopeType = "branch" | "team";

export function createSearchPolicyDefaultsRepo(db: Kysely<Database>) {
  return {
    findForScope(scopeType: DefaultScopeType, scopeId: number) {
      return db
        .selectFrom("search_policy_defaults")
        .selectAll()
        .where("scope_type", "=", scopeType)
        .where("scope_id", "=", scopeId)
        .executeTakeFirst();
    },

    listForScope(scopeType: DefaultScopeType, scopeIds: number[]) {
      if (scopeIds.length === 0) return Promise.resolve([]);
      return db
        .selectFrom("search_policy_defaults")
        .selectAll()
        .where("scope_type", "=", scopeType)
        .where("scope_id", "in", scopeIds)
        .execute();
    },

    async upsert(values: {
      scope_type: DefaultScopeType;
      scope_id: number;
      period_type: "month";
      search_limit: number;
    }): Promise<void> {
      const existing = await this.findForScope(values.scope_type, values.scope_id);
      const now = Date.now();
      if (existing) {
        await db
          .updateTable("search_policy_defaults")
          .set({ ...values, updated_at: now })
          .where("id", "=", existing.id)
          .executeTakeFirst();
      } else {
        await db
          .insertInto("search_policy_defaults")
          .values({ ...values, created_at: now, updated_at: now })
          .executeTakeFirstOrThrow();
      }
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
      if (userIds.length === 0) return Promise.resolve([]);
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
    }): Promise<void> {
      await db.transaction().execute(async (trx) => {
        await trx
          .deleteFrom("search_policy_overrides")
          .where("user_id", "=", values.user_id)
          .execute();
        await trx
          .insertInto("search_policy_overrides")
          .values({ ...values, created_at: Date.now() })
          .executeTakeFirstOrThrow();
      });
    },
  };
}

export function createLeadPolicyDefaultsRepo(db: Kysely<Database>) {
  return {
    findForScope(scopeType: DefaultScopeType, scopeId: number) {
      return db
        .selectFrom("lead_policy_defaults")
        .selectAll()
        .where("scope_type", "=", scopeType)
        .where("scope_id", "=", scopeId)
        .executeTakeFirst();
    },

    listForScope(scopeType: DefaultScopeType, scopeIds: number[]) {
      if (scopeIds.length === 0) return Promise.resolve([]);
      return db
        .selectFrom("lead_policy_defaults")
        .selectAll()
        .where("scope_type", "=", scopeType)
        .where("scope_id", "in", scopeIds)
        .execute();
    },

    async upsert(values: {
      scope_type: DefaultScopeType;
      scope_id: number;
      active_buffer_target: number;
      daily_refill_limit: number;
    }): Promise<void> {
      const existing = await this.findForScope(values.scope_type, values.scope_id);
      const now = Date.now();
      if (existing) {
        await db
          .updateTable("lead_policy_defaults")
          .set({ ...values, updated_at: now })
          .where("id", "=", existing.id)
          .executeTakeFirst();
      } else {
        await db
          .insertInto("lead_policy_defaults")
          .values({ ...values, created_at: now, updated_at: now })
          .executeTakeFirstOrThrow();
      }
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

    listActiveForUsers(userIds: number[], now: number) {
      if (userIds.length === 0) return Promise.resolve([]);
      return db
        .selectFrom("lead_policy_overrides")
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
      active_buffer_target: number;
      daily_refill_limit: number;
      effective_from: number;
      expires_at: number | null;
      set_by_user_id: number;
    }): Promise<void> {
      await db.transaction().execute(async (trx) => {
        await trx
          .deleteFrom("lead_policy_overrides")
          .where("user_id", "=", values.user_id)
          .execute();
        await trx
          .insertInto("lead_policy_overrides")
          .values({ ...values, created_at: Date.now() })
          .executeTakeFirstOrThrow();
      });
    },
  };
}

export type SearchPolicyDefaultsRepo = ReturnType<typeof createSearchPolicyDefaultsRepo>;
export type SearchPolicyOverridesRepo = ReturnType<typeof createSearchPolicyOverridesRepo>;
export type LeadPolicyDefaultsRepo = ReturnType<typeof createLeadPolicyDefaultsRepo>;
export type LeadPolicyOverridesRepo = ReturnType<typeof createLeadPolicyOverridesRepo>;
