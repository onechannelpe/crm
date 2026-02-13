import type { Kysely } from "kysely";
import type { Database, NewUserSession, UserSession } from "~/lib/db/schema";

export function createSessionRepository(db: Kysely<Database>) {
    return {
        db,

        async create(session: NewUserSession): Promise<void> {
            await db
                .insertInto("user_sessions")
                .values(session)
                .execute();
        },

        async findById(id: string): Promise<UserSession | null> {
            const session = await db
                .selectFrom("user_sessions")
                .selectAll()
                .where("id", "=", id)
                .executeTakeFirst();

            return session ?? null;
        },

        async updateActivity(id: string, lastActivity: number): Promise<void> {
            await db
                .updateTable("user_sessions")
                .set({ last_activity: lastActivity })
                .where("id", "=", id)
                .execute();
        },

        async extendExpiry(id: string, expiresAt: number): Promise<void> {
            await db
                .updateTable("user_sessions")
                .set({ expires_at: expiresAt })
                .where("id", "=", id)
                .execute();
        },

        async delete(id: string): Promise<void> {
            await db
                .deleteFrom("user_sessions")
                .where("id", "=", id)
                .execute();
        },

        async deleteAllForUser(userId: number): Promise<void> {
            await db
                .deleteFrom("user_sessions")
                .where("user_id", "=", userId)
                .execute();
        },

        async deleteExpired(): Promise<number> {
            const result = await db
                .deleteFrom("user_sessions")
                .where("expires_at", "<", Date.now())
                .executeTakeFirst();

            return Number(result.numDeletedRows ?? 0);
        },

        async listForUser(userId: number): Promise<UserSession[]> {
            return db
                .selectFrom("user_sessions")
                .selectAll()
                .where("user_id", "=", userId)
                .orderBy("last_activity", "desc")
                .execute();
        },

        async countActive(): Promise<number> {
            const result = await db
                .selectFrom("user_sessions")
                .select((eb) => eb.fn.count<number>("id").as("count"))
                .where("expires_at", ">", Date.now())
                .executeTakeFirst();

            return result?.count ?? 0;
        },
    };
}

export type SessionRepository = ReturnType<typeof createSessionRepository>;
