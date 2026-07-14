import type { Insertable, Kysely, Selectable } from "kysely";

import type { Role } from "~/lib/auth/access/rbac";
import type { Database } from "~/lib/db/types";
import type { UserId } from "~/server/shared/ids";

type UserSessionRow = Selectable<Database["user_sessions"]>;
type NewUserSessionRow = Insertable<Database["user_sessions"]>;

export function createSessionRepository(db: Kysely<Database>) {
  return {
    db,

    async create(session: NewUserSessionRow): Promise<void> {
      await db.insertInto("user_sessions").values(session).execute();
    },

    async findById(id: string): Promise<UserSessionRow | null> {
      const session = await db
        .selectFrom("user_sessions")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      return session ?? null;
    },

    async updateActivity(id: string, lastActivity: Date): Promise<void> {
      await db
        .updateTable("user_sessions")
        .set({ last_activity: lastActivity })
        .where("id", "=", id)
        .execute();
    },

    async extendExpiry(id: string, expiresAt: Date): Promise<void> {
      await db
        .updateTable("user_sessions")
        .set({ expires_at: expiresAt })
        .where("id", "=", id)
        .execute();
    },

    async delete(id: string): Promise<void> {
      await db.deleteFrom("user_sessions").where("id", "=", id).execute();
    },

    async deleteAllForUser(userId: UserId): Promise<void> {
      await db
        .deleteFrom("user_sessions")
        .where("user_id", "=", userId)
        .execute();
    },

    async deleteOtherForUser(userId: UserId, currentSessionId: string) {
      await db
        .deleteFrom("user_sessions")
        .where("user_id", "=", userId)
        .where("id", "!=", currentSessionId)
        .execute();
    },

    async deleteExpired(): Promise<number> {
      const result = await db
        .deleteFrom("user_sessions")
        .where("expires_at", "<", new Date())
        .executeTakeFirst();

      return Number(result.numDeletedRows ?? 0);
    },

    async listForUser(userId: UserId): Promise<UserSessionRow[]> {
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
        .where("expires_at", ">", new Date())
        .executeTakeFirst();

      return result?.count ?? 0;
    },

    async listAllActive(): Promise<
      Array<{
        id: string;
        userId: UserId;
        userEmail: string;
        userName: string;
        role: Role;
        branchName: string;
        ipAddress: string | null;
        userAgent: string | null;
        createdAt: Date;
        lastActivity: Date;
        expiresAt: Date;
      }>
    > {
      const sessions = await db
        .selectFrom("user_sessions")
        .innerJoin("users", "user_sessions.user_id", "users.id")
        .innerJoin("branches", "user_sessions.branch_id", "branches.id")
        .select([
          "user_sessions.id",
          "user_sessions.user_id",
          "users.email as userEmail",
          "users.names as userNames",
          "users.first_surname as userFirstSurname",
          "user_sessions.role",
          "branches.name as branchName",
          "user_sessions.ip_address as ipAddress",
          "user_sessions.user_agent as userAgent",
          "user_sessions.created_at as createdAt",
          "user_sessions.last_activity as lastActivity",
          "user_sessions.expires_at as expiresAt",
        ])
        .where("user_sessions.expires_at", ">", new Date())
        .orderBy("user_sessions.last_activity", "desc")
        .execute();

      return sessions.map((session) => ({
        id: session.id,
        userId: session.user_id,
        userEmail: session.userEmail,
        userName: `${session.userNames} ${session.userFirstSurname}`,
        role: session.role,
        branchName: session.branchName,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
      }));
    },
  };
}

export type SessionRepository = ReturnType<typeof createSessionRepository>;
