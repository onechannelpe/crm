import type { Kysely } from "kysely";

import { deriveStrongAuthRequired } from "~/lib/auth/security/strong-auth-status";
import type { Database, UsersTable } from "~/lib/db/schema";

type UserRole = UsersTable["role"];

export function createUsersRepo(db: Kysely<Database>) {
  return {
    findById(id: number) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
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

    findByBranchIncludingInactive(branchId: number) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("branch_id", "=", branchId)
        .execute();
    },

    findByTeam(teamId: number) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("team_id", "=", teamId)
        .execute();
    },

    findByBranch(branchId: number) {
      return db
        .selectFrom("users")
        .selectAll()
        .where("branch_id", "=", branchId)
        .where("is_active", "=", 1)
        .execute();
    },

    findActiveIdsByBranchAndRoles(branchId: number, roles: UserRole[]) {
      if (roles.length === 0)
        return Promise.resolve([] as Array<{ id: number }>);
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
      branch_id: number;
      team_id?: number | null;
      username: string;
      email: string;
      password_hash: string;
      names: string;
      first_surname: string;
      second_surname: string;
      expires_at?: number | null;
      phone_e164?: string | null;
      role: UserRole;
      is_active: number;
    }) {
      const strongAuthRequired = deriveStrongAuthRequired(values.role);
      const result = await db
        .insertInto("users")
        .values({
          ...values,
          expires_at: values.expires_at ?? null,
          expiry_notified_at: null,
          is_active: values.is_active,
          phone_e164: values.phone_e164 ?? null,
          phone_verified_at: null,
          profile_confirmed_at: null,
          onboarding_completed_at: null,
          strong_auth_required: strongAuthRequired,
          strong_auth_enrolled_at: null,
          created_at: Date.now(),
        })
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    },

    updatePassword(id: number, passwordHash: string) {
      return db
        .updateTable("users")
        .set({ password_hash: passwordHash })
        .where("id", "=", id)
        .execute();
    },

    updateInviteProvisioning(
      id: number,
      values: {
        team_id: number | null;
        names: string;
        first_surname: string;
        second_surname: string;
        role: UserRole;
        is_active: number;
      },
    ) {
      const strongAuthRequired = deriveStrongAuthRequired(values.role);
      if (strongAuthRequired === 1) {
        return db
          .updateTable("users")
          .set({
            team_id: values.team_id,
            names: values.names,
            first_surname: values.first_surname,
            second_surname: values.second_surname,
            role: values.role,
            is_active: values.is_active,
            strong_auth_required: 1,
          })
          .where("id", "=", id)
          .execute();
      }

      return db
        .updateTable("users")
        .set({
          team_id: values.team_id,
          names: values.names,
          first_surname: values.first_surname,
          second_surname: values.second_surname,
          role: values.role,
          is_active: values.is_active,
          strong_auth_required: 0,
        })
        .where("id", "=", id)
        .execute();
    },

    completeOnboarding(
      id: number,
      values: { phone_e164: string; completedAt: number },
    ) {
      return db
        .updateTable("users")
        .set({
          phone_e164: values.phone_e164,
          phone_verified_at: values.completedAt,
          profile_confirmed_at: values.completedAt,
          onboarding_completed_at: values.completedAt,
        })
        .where("id", "=", id)
        .execute();
    },

    updatePhone(id: number, phone: string) {
      return db
        .updateTable("users")
        .set({ phone_e164: phone })
        .where("id", "=", id)
        .execute();
    },

    findAvatarMetaById(id: number) {
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
      id: number,
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
      id: number,
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

    async expireActiveUsersBefore(now: number): Promise<number[]> {
      const rows = await db
        .updateTable("users")
        .set({ is_active: 0 })
        .where("expires_at", "<=", now)
        .where("is_active", "=", 1)
        .returning("id")
        .execute();
      return rows.map((r) => r.id);
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

    markExpiryNotified(userId: number, notifiedAt: number) {
      return db
        .updateTable("users")
        .set({ expiry_notified_at: notifiedAt })
        .where("id", "=", userId)
        .execute();
    },
  };
}
