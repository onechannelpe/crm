import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";

type DefaultScopeType = "branch" | "team";
type DefaultScopeId = BranchId | TeamId;

export function createSearchPolicyDefaultsRepo(db: Kysely<Database>) {
  const findForScope = (scopeType: DefaultScopeType, scopeId: DefaultScopeId) =>
    db
      .selectFrom("search_policy_defaults")
      .selectAll()
      .where("scope_type", "=", scopeType)
      .where("scope_id", "=", scopeId)
      .executeTakeFirst();

  const listForScope = (
    scopeType: DefaultScopeType,
    scopeIds: DefaultScopeId[],
  ) => {
    if (scopeIds.length === 0) return Promise.resolve([]);
    return db
      .selectFrom("search_policy_defaults")
      .selectAll()
      .where("scope_type", "=", scopeType)
      .where("scope_id", "in", scopeIds)
      .execute();
  };

  const upsert = async (values: {
    scope_type: DefaultScopeType;
    scope_id: DefaultScopeId;
    period_type: "month";
    search_limit: number;
  }): Promise<void> => {
    const existing = await findForScope(values.scope_type, values.scope_id);
    const now = new Date();
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
  };

  return { findForScope, listForScope, upsert };
}

export function createSearchPolicyOverridesRepo(db: Kysely<Database>) {
  const findActiveForUser = (userId: UserId, now: Date) =>
    db
      .selectFrom("search_policy_overrides")
      .selectAll()
      .where("user_id", "=", userId)
      .where("effective_from", "<=", now)
      .where((eb) =>
        eb.or([eb("expires_at", "is", null), eb("expires_at", ">", now)]),
      )
      .orderBy("created_at", "desc")
      .executeTakeFirst();

  const listActiveForUsers = (userIds: UserId[], now: Date) => {
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
  };

  const replaceForUser = async (values: {
    user_id: UserId;
    search_limit: number;
    effective_from: Date;
    expires_at: Date | null;
    set_by_user_id: UserId;
  }): Promise<void> => {
    await db
      .deleteFrom("search_policy_overrides")
      .where("user_id", "=", values.user_id)
      .execute();
    await db
      .insertInto("search_policy_overrides")
      .values({ ...values, created_at: new Date() })
      .executeTakeFirstOrThrow();
  };

  return { findActiveForUser, listActiveForUsers, replaceForUser };
}

export function createLeadPolicyDefaultsRepo(db: Kysely<Database>) {
  const findForScope = (scopeType: DefaultScopeType, scopeId: DefaultScopeId) =>
    db
      .selectFrom("lead_policy_defaults")
      .selectAll()
      .where("scope_type", "=", scopeType)
      .where("scope_id", "=", scopeId)
      .executeTakeFirst();

  const listForScope = (
    scopeType: DefaultScopeType,
    scopeIds: DefaultScopeId[],
  ) => {
    if (scopeIds.length === 0) return Promise.resolve([]);
    return db
      .selectFrom("lead_policy_defaults")
      .selectAll()
      .where("scope_type", "=", scopeType)
      .where("scope_id", "in", scopeIds)
      .execute();
  };

  const upsert = async (values: {
    scope_type: DefaultScopeType;
    scope_id: DefaultScopeId;
    active_buffer_target: number;
    daily_refill_limit: number;
  }): Promise<void> => {
    const existing = await findForScope(values.scope_type, values.scope_id);
    const now = new Date();
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
  };

  return { findForScope, listForScope, upsert };
}

export function createLeadPolicyOverridesRepo(db: Kysely<Database>) {
  const findActiveForUser = (userId: UserId, now: Date) =>
    db
      .selectFrom("lead_policy_overrides")
      .selectAll()
      .where("user_id", "=", userId)
      .where("effective_from", "<=", now)
      .where((eb) =>
        eb.or([eb("expires_at", "is", null), eb("expires_at", ">", now)]),
      )
      .orderBy("created_at", "desc")
      .executeTakeFirst();

  const listActiveForUsers = (userIds: UserId[], now: Date) => {
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
  };

  const replaceForUser = async (values: {
    user_id: UserId;
    active_buffer_target: number;
    daily_refill_limit: number;
    effective_from: Date;
    expires_at: Date | null;
    set_by_user_id: UserId;
  }): Promise<void> => {
    await db
      .deleteFrom("lead_policy_overrides")
      .where("user_id", "=", values.user_id)
      .execute();
    await db
      .insertInto("lead_policy_overrides")
      .values({ ...values, created_at: new Date() })
      .executeTakeFirstOrThrow();
  };

  return { findActiveForUser, listActiveForUsers, replaceForUser };
}

export type SearchPolicyDefaultsRepo = ReturnType<
  typeof createSearchPolicyDefaultsRepo
>;
export type SearchPolicyOverridesRepo = ReturnType<
  typeof createSearchPolicyOverridesRepo
>;
export type LeadPolicyDefaultsRepo = ReturnType<
  typeof createLeadPolicyDefaultsRepo
>;
export type LeadPolicyOverridesRepo = ReturnType<
  typeof createLeadPolicyOverridesRepo
>;
