import { sql, type Insertable, type Kysely, type Selectable } from "kysely";

import type { Role } from "~/lib/auth/access/rbac";
import type { Database } from "~/lib/db/types";
import {
  asBranchId,
  asUserId,
  type BranchId,
  type UserId,
} from "~/server/shared/ids";

type UserSessionRow = Selectable<Database["user_sessions"]>;
type NewUserSessionRow = Insertable<Database["user_sessions"]>;
type HydratedUserSessionRow = Omit<UserSessionRow, "user_id" | "branch_id"> & {
  user_id: UserId;
  branch_id: BranchId;
};

export function createSessionRepository(db: Kysely<Database>) {
  return {
    db,

    async create(session: NewUserSessionRow): Promise<void> {
      await db.insertInto("user_sessions").values(session).execute();
    },

    async findById(id: string): Promise<HydratedUserSessionRow | null> {
      const session = await db
        .selectFrom("user_sessions")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      if (!session) {
        return null;
      }
      return {
        ...session,
        user_id: asUserId(session.user_id),
        branch_id: asBranchId(session.branch_id),
      };
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
      await db.deleteFrom("user_sessions").where("id", "=", id).execute();
    },

    async deleteAllForUser(userId: UserId): Promise<void> {
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
        .where("expires_at", ">", Date.now())
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
        createdAt: number;
        lastActivity: number;
        expiresAt: number;
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
          sql<string>`users.names || ' ' || users.first_surname`.as("userName"),
          "user_sessions.role",
          "branches.name as branchName",
          "user_sessions.ip_address as ipAddress",
          "user_sessions.user_agent as userAgent",
          "user_sessions.created_at as createdAt",
          "user_sessions.last_activity as lastActivity",
          "user_sessions.expires_at as expiresAt",
        ])
        .where("user_sessions.expires_at", ">", Date.now())
        .orderBy("user_sessions.last_activity", "desc")
        .execute();

      return sessions.map((session) => ({
        id: session.id,
        userId: asUserId(session.user_id),
        userEmail: session.userEmail,
        userName: session.userName,
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
