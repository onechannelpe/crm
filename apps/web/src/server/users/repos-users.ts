import type { ExecutiveCategoryValue, UsersTable } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

type UserRole = UsersTable["role"];

type UserNameRow = {
  id: string;
  names: string;
  first_surname: string;
  second_surname: string;
};

type AssignableExecutiveRow = {
  id: string;
  names: string;
  first_surname: string;
  second_surname: string;
};

export function createUsersRepo(db: DatabaseExecutor) {
  return {
    findById(id: string) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    findByIds(ids: string[]): Promise<UserNameRow[]> {
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
      branchId?: string;
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
        .execute();
    },

    findByEmail(email: string) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("email", "=", email)
        .executeTakeFirst();
    },

    findByUsername(username: string) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("username", "=", username)
        .executeTakeFirst();
    },

    findByBranchIncludingInactive(branchId: string) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("branch_id", "=", branchId)
        .execute();
    },

    findByTeam(teamId: string) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("team_id", "=", teamId)
        .execute();
    },

    findByBranch(branchId: string) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("branch_id", "=", branchId)
        .where("is_active", "=", 1)
        .execute();
    },

    findActiveIdsByBranchAndRoles(branchId: string, roles: UserRole[]) {
      if (roles.length === 0)
        return Promise.resolve([] as Array<{ id: string }>);
      return db
        .selectFrom("users")
        .select("id")
        .where("branch_id", "=", branchId)
        .where("is_active", "=", 1)
        .where("onboarding_completed_at", "is not", null)
        .where("role", "in", roles)
        .execute();
    },

    findAllActive() {
      return db
        .selectFrom("users")
        .selectAll()
        .where("is_active", "=", 1)
        .execute();
    },

    async create(values: {
      id: string;
      branch_id: string;
      team_id?: string | null;
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

    updatePassword(id: string, passwordHash: string) {
      return db
        .updateTable("users")
        .set({ password_hash: passwordHash })
        .where("id", "=", id)
        .execute();
    },

    updateInviteProvisioning(
      id: string,
      values: {
        team_id: string | null;
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
      id: string,
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

    updatePhone(id: string, phone: string) {
      return db
        .updateTable("users")
        .set({ phone_e164: phone })
        .where("id", "=", id)
        .execute();
    },

    findAvatarMetaById(id: string) {
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
        .executeTakeFirst();
    },

    updateAvatar(
      id: string,
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
      id: string,
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

    async expireActiveUsersBefore(now: number): Promise<string[]> {
      const rows = await db
        .updateTable("users")
        .set({ is_active: 0 })
        .where("expires_at", "<=", now)
        .where("is_active", "=", 1)
        .returning("id")
        .execute();
      return rows.map((r) => r.id);
    },

    async deactivateIfExpired(userId: string, now: number): Promise<boolean> {
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
        .execute();
    },

    async claimExpiryReminder(
      userId: string,
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

    releaseExpiryReminderClaim(userId: string, claimedAt: number) {
      return db
        .updateTable("users")
        .set({ expiry_notified_at: null })
        .where("id", "=", userId)
        .where("expiry_notified_at", "=", claimedAt)
        .execute();
    },

    markExpiryNotified(userId: string, notifiedAt: number) {
      return db
        .updateTable("users")
        .set({ expiry_notified_at: notifiedAt })
        .where("id", "=", userId)
        .execute();
    },
  };
}

export type UsersRepo = ReturnType<typeof createUsersRepo>;
