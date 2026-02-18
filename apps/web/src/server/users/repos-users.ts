import type { Kysely } from "kysely";

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
      email: string;
      password_hash: string;
      full_name: string;
      phone_e164?: string | null;
      role: UserRole;
    }) {
      const result = await db
        .insertInto("users")
        .values({
          ...values,
          is_active: 1,
          phone_e164: values.phone_e164 ?? null,
          phone_verified_at: null,
          profile_confirmed_at: null,
          onboarding_completed_at: null,
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
        full_name: string;
        role: UserRole;
        is_active: number;
      },
    ) {
      return db
        .updateTable("users")
        .set({
          team_id: values.team_id,
          full_name: values.full_name,
          role: values.role,
          is_active: values.is_active,
        })
        .where("id", "=", id)
        .execute();
    },

    completeOnboarding(
      id: number,
      values: { full_name: string; phone_e164: string; completedAt: number },
    ) {
      return db
        .updateTable("users")
        .set({
          full_name: values.full_name,
          phone_e164: values.phone_e164,
          phone_verified_at: values.completedAt,
          profile_confirmed_at: values.completedAt,
          onboarding_completed_at: values.completedAt,
        })
        .where("id", "=", id)
        .execute();
    },
  };
}
