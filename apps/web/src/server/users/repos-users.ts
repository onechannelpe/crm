import type { Selectable } from "kysely";

import type { ExecutiveCategoryValue, UsersTable } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import {
  asBranchId,
  asTeamId,
  asUserId,
  type BranchId,
  type TeamId,
  type UserId,
} from "~/server/shared/ids";

type UserRole = UsersTable["role"];

export type UserWithBrandedIds = Selectable<UsersTable> & {
  id: UserId;
  branch_id: BranchId;
  team_id: TeamId | null;
};

type UserNameRow = {
  id: UserId;
  names: string;
  first_surname: string;
  second_surname: string;
};

type AssignableExecutiveRow = {
  id: UserId;
  names: string;
  first_surname: string;
  second_surname: string;
};

export function createUsersRepo(db: DatabaseExecutor) {
  return {
    findById(id: UserId) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst() as Promise<UserWithBrandedIds | undefined>;
    },

    findByIds(ids: UserId[]): Promise<UserNameRow[]> {
      if (ids.length === 0) {
        return Promise.resolve([]);
      }

      return db
        .selectFrom("users")
        .select(["id", "names", "first_surname", "second_surname"])
        .where("id", "in", ids)
        .execute() as Promise<UserNameRow[]>;
    },

    findAssignableExecutives(input: {
      branchId?: BranchId;
      search?: string;
      limit: number;
    }): Promise<AssignableExecutiveRow[]> {
      let query = db
        .selectFrom("users")
        .select(["id", "names", "first_surname", "second_surname"])
        .where("role", "=", "executive")
        .where("is_active", "=", 1)
        .where("onboarding_completed_at", "is not", null);

      if (input.branchId != null) {
        query = query.where("branch_id", "=", input.branchId);
      }

      const term = input.search?.trim().toLowerCase();
      if (term) {
        const pattern = `%${term}%`;
        query = query.where((eb) =>
          eb.or([
            eb(eb.fn("lower", ["names"]), "like", pattern),
            eb(eb.fn("lower", ["first_surname"]), "like", pattern),
            eb(eb.fn("lower", ["second_surname"]), "like", pattern),
          ]),
        );
      }

      return query
        .orderBy("names", "asc")
        .orderBy("first_surname", "asc")
        .orderBy("second_surname", "asc")
        .limit(input.limit)
        .execute() as Promise<AssignableExecutiveRow[]>;
    },

    findByEmail(email: string) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("email", "=", email)
        .executeTakeFirst() as Promise<UserWithBrandedIds | undefined>;
    },

    findByUsername(username: string) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("username", "=", username)
        .executeTakeFirst() as Promise<UserWithBrandedIds | undefined>;
    },

    findByBranchIncludingInactive(branchId: BranchId) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("branch_id", "=", branchId)
        .execute() as Promise<UserWithBrandedIds[]>;
    },

    findByTeam(teamId: TeamId) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("team_id", "=", teamId)
        .execute() as Promise<UserWithBrandedIds[]>;
    },

    findByBranch(branchId: BranchId) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("branch_id", "=", branchId)
        .where("is_active", "=", 1)
        .execute() as Promise<UserWithBrandedIds[]>;
    },

    findActiveIdsByBranchAndRoles(branchId: BranchId, roles: UserRole[]) {
      if (roles.length === 0)
        return Promise.resolve([] as Array<{ id: UserId }>);
      return db
        .selectFrom("users")
        .select("id")
        .where("branch_id", "=", branchId)
        .where("is_active", "=", 1)
        .where("onboarding_completed_at", "is not", null)
        .where("role", "in", roles)
        .execute() as Promise<Array<{ id: UserId }>>;
    },

    findAllActive() {
      return db
        .selectFrom("users")
        .selectAll()
        .where("is_active", "=", 1)
        .execute() as Promise<UserWithBrandedIds[]>;
    },

    async create(values: {
      id: UserId;
      branch_id: BranchId;
      team_id?: TeamId | null;
      username: string;
      email: string;
      password_hash: string;
      names: string;
      first_surname: string;
      second_surname: string;
      expires_at?: number | null;
      phone_e164?: string | null;
      role: UserRole;
      executive_category?: ExecutiveCategoryValue | null;
      is_active: number;
    }) {
      await db
        .insertInto("users")
        .values({
          ...values,
          expires_at: values.expires_at ?? null,
          expiry_notified_at: null,
          is_active: values.is_active,
          phone_e164: values.phone_e164 ?? null,
          executive_category: values.executive_category ?? null,
          onboarding_completed_at: null,
          created_at: Date.now(),
        })
        .executeTakeFirstOrThrow();
      return values.id;
    },

    updatePassword(id: UserId, passwordHash: string) {
      return db
        .updateTable("users")
        .set({ password_hash: passwordHash })
        .where("id", "=", id)
        .execute();
    },

    updateInviteProvisioning(
      id: UserId,
      values: {
        team_id: TeamId | null;
        names: string;
        first_surname: string;
        second_surname: string;
        role: UserRole;
        executive_category?: ExecutiveCategoryValue | null;
        is_active: number;
      },
    ) {
      return db
        .updateTable("users")
        .set({
          team_id: values.team_id,
          names: values.names,
          first_surname: values.first_surname,
          second_surname: values.second_surname,
          role: values.role,
          executive_category: values.executive_category ?? null,
          is_active: values.is_active,
        })
        .where("id", "=", id)
        .execute();
    },

    completeOnboarding(
      id: UserId,
      values: { phone_e164: string; completedAt: number },
    ) {
      return db
        .updateTable("users")
        .set({
          phone_e164: values.phone_e164,
          onboarding_completed_at: values.completedAt,
        })
        .where("id", "=", id)
        .execute();
    },

    updatePhone(id: UserId, phone: string) {
      return db
        .updateTable("users")
        .set({ phone_e164: phone })
        .where("id", "=", id)
        .execute();
    },

    findAvatarMetaById(id: UserId) {
      return db
        .selectFrom("users")
        .select([
          "id",
          "avatar_storage_key",
          "avatar_mime_type",
          "avatar_updated_at",
          "avatar_version",
        ])
        .where("id", "=", id)
        .executeTakeFirst() as Promise<
        | {
            id: UserId;
            avatar_storage_key: string | null;
            avatar_mime_type: string | null;
            avatar_updated_at: number | null;
            avatar_version: number;
          }
        | undefined
      >;
    },

    updateAvatar(
      id: UserId,
      values: {
        storage_key: string;
        mime_type: string;
        updated_at: number;
        version: number;
      },
    ) {
      return db
        .updateTable("users")
        .set({
          avatar_storage_key: values.storage_key,
          avatar_mime_type: values.mime_type,
          avatar_updated_at: values.updated_at,
          avatar_version: values.version,
        })
        .where("id", "=", id)
        .execute();
    },

    clearAvatar(
      id: UserId,
      values: {
        updated_at: number;
        version: number;
      },
    ) {
      return db
        .updateTable("users")
        .set({
          avatar_storage_key: null,
          avatar_mime_type: null,
          avatar_updated_at: values.updated_at,
          avatar_version: values.version,
        })
        .where("id", "=", id)
        .execute();
    },

    async expireActiveUsersBefore(now: number): Promise<UserId[]> {
      const rows = await db
        .updateTable("users")
        .set({ is_active: 0 })
        .where("expires_at", "<=", now)
        .where("is_active", "=", 1)
        .returning("id")
        .execute();
      return rows.map((r) => asUserId(r.id));
    },

    async deactivateIfExpired(userId: UserId, now: number): Promise<boolean> {
      const result = await db
        .updateTable("users")
        .set({ is_active: 0 })
        .where("id", "=", userId)
        .where("is_active", "=", 1)
        .where("expires_at", "is not", null)
        .where("expires_at", "<=", now)
        .executeTakeFirst();

      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    findExpiringBefore(threshold: number) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("expires_at", "<=", threshold)
        .where("expires_at", "is not", null)
        .where("expiry_notified_at", "is", null)
        .where("is_active", "=", 1)
        .execute() as Promise<UserWithBrandedIds[]>;
    },

    async claimExpiryReminder(
      userId: UserId,
      threshold: number,
      claimedAt: number,
    ): Promise<boolean> {
      const result = await db
        .updateTable("users")
        .set({ expiry_notified_at: claimedAt })
        .where("id", "=", userId)
        .where("is_active", "=", 1)
        .where("expires_at", "is not", null)
        .where("expires_at", "<=", threshold)
        .where("expiry_notified_at", "is", null)
        .executeTakeFirst();

      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    releaseExpiryReminderClaim(userId: UserId, claimedAt: number) {
      return db
        .updateTable("users")
        .set({ expiry_notified_at: null })
        .where("id", "=", userId)
        .where("expiry_notified_at", "=", claimedAt)
        .execute();
    },

    markExpiryNotified(userId: UserId, notifiedAt: number) {
      return db
        .updateTable("users")
        .set({ expiry_notified_at: notifiedAt })
        .where("id", "=", userId)
        .execute();
    },
  };
}

export type UsersRepo = ReturnType<typeof createUsersRepo>;
