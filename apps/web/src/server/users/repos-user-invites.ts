import type { Insertable, Kysely } from "kysely";

import type { Database, UserInvitesTable, UsersTable } from "~/lib/db/types";

type NewUserInviteRow = Insertable<UserInvitesTable>;

type InviteStatus = UserInvitesTable["status"];
type UserRole = UsersTable["role"];

export interface PendingInviteWithUser {
  invite_id: number;
  invite_status: InviteStatus;
  invite_expires_at: number;
  invite_created_at: number;
  invite_created_by_user_id: number;
  invite_sent_at: number | null;
  user_id: number;
  user_email: string;
  user_role: UserRole;
  user_branch_id: number;
  user_team_id: number | null;
  user_names: string;
  user_first_surname: string;
  user_second_surname: string;
  user_is_active: number;
}

export function createUserInvitesRepo(db: Kysely<Database>) {
  return {
    async create(values: NewUserInviteRow): Promise<number> {
      const result = await db
        .insertInto("user_invites")
        .values(values)
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    },

    async findLatestPendingByBranch(
      branchId: number,
      now: number,
    ): Promise<PendingInviteWithUser[]> {
      return db
        .selectFrom("user_invites")
        .innerJoin("users", "users.id", "user_invites.user_id")
        .select([
          "user_invites.id as invite_id",
          "user_invites.status as invite_status",
          "user_invites.expires_at as invite_expires_at",
          "user_invites.created_at as invite_created_at",
          "user_invites.created_by_user_id as invite_created_by_user_id",
          "user_invites.sent_at as invite_sent_at",
          "users.id as user_id",
          "users.email as user_email",
          "users.role as user_role",
          "users.branch_id as user_branch_id",
          "users.team_id as user_team_id",
          "users.names as user_names",
          "users.first_surname as user_first_surname",
          "users.second_surname as user_second_surname",
          "users.is_active as user_is_active",
        ])
        .where("user_invites.branch_id", "=", branchId)
        .where("user_invites.status", "=", "pending")
        .where("user_invites.expires_at", ">", now)
        .orderBy("user_invites.created_at", "desc")
        .execute();
    },

    findById(inviteId: number) {
      return db
        .selectFrom("user_invites")
        .selectAll()
        .where("id", "=", inviteId)
        .executeTakeFirst();
    },

    findPendingByTokenHash(tokenHash: string, now: number) {
      return db
        .selectFrom("user_invites")
        .innerJoin("users", "users.id", "user_invites.user_id")
        .select([
          "user_invites.id as invite_id",
          "user_invites.status as invite_status",
          "user_invites.expires_at as invite_expires_at",
          "user_invites.created_at as invite_created_at",
          "user_invites.created_by_user_id as invite_created_by_user_id",
          "user_invites.sent_at as invite_sent_at",
          "users.id as user_id",
          "users.email as user_email",
          "users.role as user_role",
          "users.branch_id as user_branch_id",
          "users.team_id as user_team_id",
          "users.names as user_names",
          "users.first_surname as user_first_surname",
          "users.second_surname as user_second_surname",
          "users.username as user_username",
          "users.is_active as user_is_active",
        ])
        .where("user_invites.token_hash", "=", tokenHash)
        .where("user_invites.status", "=", "pending")
        .where("user_invites.expires_at", ">", now)
        .executeTakeFirst();
    },

    revokePendingByUser(userId: number, revokedAt: number) {
      return db
        .updateTable("user_invites")
        .set({
          status: "revoked",
          revoked_at: revokedAt,
        })
        .where("user_id", "=", userId)
        .where("status", "=", "pending")
        .executeTakeFirst();
    },

    expirePendingBefore(now: number) {
      return db
        .updateTable("user_invites")
        .set({ status: "expired" })
        .where("status", "=", "pending")
        .where("expires_at", "<=", now)
        .executeTakeFirst();
    },

    markAccepted(inviteId: number, acceptedAt: number) {
      return db
        .updateTable("user_invites")
        .set({
          status: "accepted",
          accepted_at: acceptedAt,
        })
        .where("id", "=", inviteId)
        .where("status", "=", "pending")
        .executeTakeFirst();
    },

    markSent(inviteId: number, sentAt: number) {
      return db
        .updateTable("user_invites")
        .set({ sent_at: sentAt })
        .where("id", "=", inviteId)
        .executeTakeFirst();
    },
  };
}

export type UserInvitesRepo = ReturnType<typeof createUserInvitesRepo>;
