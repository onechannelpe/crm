import type { Kysely } from "kysely";
import type { Database, UsersTable } from "~/lib/db/schema";

type UserRole = UsersTable["role"];

export function createUsersRepo(db: Kysely<Database>) {
    return {
        findById(id: number) {
            return db.selectFrom("users").selectAll().where("id", "=", id).executeTakeFirst();
        },

        findByEmail(email: string) {
            return db.selectFrom("users").selectAll().where("email", "=", email).executeTakeFirst();
        },

        findByTeam(teamId: number) {
            return db.selectFrom("users").selectAll().where("team_id", "=", teamId).execute();
        },

        findByBranch(branchId: number) {
            return db
                .selectFrom("users")
                .selectAll()
                .where("branch_id", "=", branchId)
                .where("is_active", "=", 1)
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
            role: UserRole;
        }) {
            const result = await db
                .insertInto("users")
                .values({ ...values, is_active: 1, created_at: Date.now() })
                .executeTakeFirstOrThrow();
            return Number(result.insertId);
        },

        updatePassword(id: number, passwordHash: string) {
            return db.updateTable("users").set({ password_hash: passwordHash }).where("id", "=", id).execute();
        },
    };
}
