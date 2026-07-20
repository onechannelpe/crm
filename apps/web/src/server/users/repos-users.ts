import type { ExecutiveCategoryValue, UsersTable } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";

type UserRole = UsersTable["role"];

type UserNameRow = {
  id: UserId;
  names: string;
  first_surname: string;
  second_surname: string;
};

export type MemberRosterRow = {
  id: UserId;
  names: string;
  first_surname: string;
  second_surname: string;
  email: string;
  role: UserRole;
  executive_category: ExecutiveCategoryValue | null;
  is_active: boolean;
  avatar_storage_key: string | null;
  avatar_version: number;
  expires_at: Date | null;
  onboarding_completed_at: Date | null;
  team_id: TeamId | null;
  team_name: string | null;
};

export function createUsersRepo(db: DatabaseExecutor) {
  return {
    findById(id: UserId) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    findByIdForUpdate(id: UserId) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("id", "=", id)
        .forUpdate()
        .executeTakeFirst();
    },

    findByIds(ids: UserId[]): Promise<UserNameRow[]> {
      if (ids.length === 0) {
        return Promise.resolve([]);
      }

      return db
        .selectFrom("users")
        .select(["id", "names", "first_surname", "second_surname"])
        .where("id", "in", ids)
        .execute();
    },

    findAssignableExecutives(input: {
      branchId?: BranchId;
      search?: string;
      limit: number;
    }): Promise<UserNameRow[]> {
      let query = db
        .selectFrom("users")
        .select(["id", "names", "first_surname", "second_surname"])
        .where("role", "=", "executive")
        .where("is_active", "=", true)
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

    findByBranchIncludingInactive(branchId: BranchId) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("branch_id", "=", branchId)
        .execute();
    },

    findByTeam(teamId: TeamId) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("team_id", "=", teamId)
        .execute();
    },

    findByBranch(branchId: BranchId) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("branch_id", "=", branchId)
        .where("is_active", "=", true)
        .execute();
    },

    findActiveIdsByBranchAndRoles(branchId: BranchId, roles: UserRole[]) {
      if (roles.length === 0) {
        return Promise.resolve([] as Array<{ id: UserId }>);
      }

      return db
        .selectFrom("users")
        .select("id")
        .where("branch_id", "=", branchId)
        .where("is_active", "=", true)
        .where("onboarding_completed_at", "is not", null)
        .where("role", "in", roles)
        .execute();
    },

    findAllActive() {
      return db
        .selectFrom("users")
        .selectAll()
        .where("is_active", "=", true)
        .execute();
    },

    listByBranchWithTeam(branchId: BranchId): Promise<MemberRosterRow[]> {
      return db
        .selectFrom("users")
        .leftJoin("teams", "teams.id", "users.team_id")
        .select([
          "users.id as id",
          "users.names as names",
          "users.first_surname as first_surname",
          "users.second_surname as second_surname",
          "users.email as email",
          "users.role as role",
          "users.executive_category as executive_category",
          "users.is_active as is_active",
          "users.avatar_storage_key as avatar_storage_key",
          "users.avatar_version as avatar_version",
          "users.expires_at as expires_at",
          "users.onboarding_completed_at as onboarding_completed_at",
          "users.team_id as team_id",
          "teams.name as team_name",
        ])
        .where("users.branch_id", "=", branchId)
        .orderBy("users.is_active", "desc")
        .orderBy("users.names", "asc")
        .orderBy("users.first_surname", "asc")
        .execute();
    },

    async create(values: {
      branch_id: BranchId;
      team_id?: TeamId | null;
      username: string;
      email: string;
      password_hash: string;
      names: string;
      first_surname: string;
      second_surname: string;
      expires_at?: Date | null;
      role: UserRole;
      executive_category?: ExecutiveCategoryValue | null;
      is_active: boolean;
    }) {
      return (
        db
          .insertInto("users")
          .values({
            ...values,
            expires_at: values.expires_at ?? null,
            expiry_notified_at: null,
            is_active: values.is_active,
            executive_category: values.executive_category ?? null,
            password_change_required: false,
            onboarding_completed_at: null,
            created_at: new Date(),
          })
          // A unique conflict must not abort the caller's transaction.
          .onConflict((oc) => oc.doNothing())
          .returningAll()
          .executeTakeFirst()
      );
    },

    updatePassword(id: UserId, passwordHash: string) {
      return db
        .updateTable("users")
        .set({ password_hash: passwordHash })
        .where("id", "=", id)
        .execute();
    },

    replaceInstallationPassword(id: UserId, passwordHash: string) {
      return db
        .updateTable("users")
        .set({
          password_hash: passwordHash,
          password_change_required: false,
        })
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
        is_active: boolean;
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

    updateProfile(
      id: UserId,
      values: {
        names: string;
        first_surname: string;
        second_surname: string;
        team_id: TeamId | null;
        executive_category: ExecutiveCategoryValue | null;
      },
    ) {
      return db
        .updateTable("users")
        .set({
          names: values.names,
          first_surname: values.first_surname,
          second_surname: values.second_surname,
          team_id: values.team_id,
          executive_category: values.executive_category,
        })
        .where("id", "=", id)
        .execute();
    },

    updateRole(
      id: UserId,
      values: {
        role: UserRole;
        executive_category: ExecutiveCategoryValue | null;
      },
    ) {
      return db
        .updateTable("users")
        .set({
          role: values.role,
          executive_category: values.executive_category,
        })
        .where("id", "=", id)
        .execute();
    },

    setActive(id: UserId, isActive: boolean) {
      return db
        .updateTable("users")
        .set({ is_active: isActive })
        .where("id", "=", id)
        .execute();
    },

    updateExpiry(id: UserId, expiresAt: Date | null) {
      return db
        .updateTable("users")
        .set({
          expires_at: expiresAt,
          expiry_notified_at: null,
        })
        .where("id", "=", id)
        .execute();
    },

    deleteById(id: UserId) {
      return db.deleteFrom("users").where("id", "=", id).execute();
    },

    completeOnboarding(id: UserId, values: { completedAt: Date }) {
      return db
        .updateTable("users")
        .set({ onboarding_completed_at: values.completedAt })
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
        .executeTakeFirst();
    },

    updateAvatar(
      id: UserId,
      values: {
        storage_key: string;
        mime_type: string;
        updated_at: Date;
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
        updated_at: Date;
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

    async expireActiveUsersBefore(now: Date): Promise<UserId[]> {
      const rows = await db
        .updateTable("users")
        .set({ is_active: false })
        .where("expires_at", "<=", now)
        .where("is_active", "=", true)
        .returning("id")
        .execute();

      return rows.map((row) => row.id);
    },

    async deactivateIfExpired(userId: UserId, now: Date): Promise<boolean> {
      const result = await db
        .updateTable("users")
        .set({ is_active: false })
        .where("id", "=", userId)
        .where("is_active", "=", true)
        .where("expires_at", "is not", null)
        .where("expires_at", "<=", now)
        .executeTakeFirst();

      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    findExpiringBefore(threshold: Date) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("expires_at", "<=", threshold)
        .where("expires_at", "is not", null)
        .where("expiry_notified_at", "is", null)
        .where("is_active", "=", true)
        .execute();
    },

    async claimExpiryReminder(
      userId: UserId,
      threshold: Date,
      claimedAt: Date,
    ): Promise<boolean> {
      const result = await db
        .updateTable("users")
        .set({ expiry_notified_at: claimedAt })
        .where("id", "=", userId)
        .where("is_active", "=", true)
        .where("expires_at", "is not", null)
        .where("expires_at", "<=", threshold)
        .where("expiry_notified_at", "is", null)
        .executeTakeFirst();

      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    releaseExpiryReminderClaim(userId: UserId, claimedAt: Date) {
      return db
        .updateTable("users")
        .set({ expiry_notified_at: null })
        .where("id", "=", userId)
        .where("expiry_notified_at", "=", claimedAt)
        .execute();
    },

    markExpiryNotified(userId: UserId, notifiedAt: Date) {
      return db
        .updateTable("users")
        .set({ expiry_notified_at: notifiedAt })
        .where("id", "=", userId)
        .execute();
    },
  };
}

export type UsersRepo = ReturnType<typeof createUsersRepo>;
