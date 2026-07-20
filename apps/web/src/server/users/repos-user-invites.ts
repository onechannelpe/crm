import type { Insertable, Kysely } from "kysely";

import type { Database, UserInvitesTable, UsersTable } from "~/lib/db/types";
import type {
  BranchId,
  TeamId,
  UserId,
  UserInviteId,
} from "~/server/shared/ids";

type NewUserInviteRow = Insertable<UserInvitesTable>;

type InviteStatus = UserInvitesTable["status"];
type UserRole = UsersTable["role"];

export interface PendingInviteWithUser {
  invite_id: UserInviteId;
  invite_status: InviteStatus;
  invite_expires_at: Date;
  invite_created_at: Date;
  invite_created_by_user_id: UserId;
  invite_token: string;
  invite_last_delivered_at: Date | null;
  user_id: UserId;
  user_email: string;
  user_role: UserRole;
  user_branch_id: BranchId;
  user_team_id: TeamId | null;
  user_names: string;
  user_first_surname: string;
  user_second_surname: string;
  user_is_active: boolean;
}

export function createUserInvitesRepo(db: Kysely<Database>) {
  return {
    async create(values: NewUserInviteRow): Promise<UserInviteId> {
      const result = await db
        .insertInto("user_invites")
        .values(values)
        .returning("id")
        .executeTakeFirstOrThrow();
      return result.id;
    },

    async findLatestPendingByBranch(
      branchId: BranchId,
      now: Date,
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
          "user_invites.token as invite_token",
          "user_invites.last_delivered_at as invite_last_delivered_at",
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

    findById(inviteId: UserInviteId) {
      return db
        .selectFrom("user_invites")
        .selectAll()
        .where("id", "=", inviteId)
        .executeTakeFirst();
    },

    findPendingByToken(token: string, now: Date) {
      return db
        .selectFrom("user_invites")
        .innerJoin("users", "users.id", "user_invites.user_id")
        .select([
          "user_invites.id as invite_id",
          "user_invites.status as invite_status",
          "user_invites.expires_at as invite_expires_at",
          "user_invites.created_at as invite_created_at",
          "user_invites.created_by_user_id as invite_created_by_user_id",
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
        .where("user_invites.token", "=", token)
        .where("user_invites.status", "=", "pending")
        .where("user_invites.expires_at", ">", now)
        .executeTakeFirst();
    },

    revokePendingByUser(userId: UserId, revokedAt: Date) {
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

    refreshExpiry(inviteId: UserInviteId, expiresAt: Date) {
      return db
        .updateTable("user_invites")
        .set({ expires_at: expiresAt })
        .where("id", "=", inviteId)
        .where("status", "=", "pending")
        .executeTakeFirst();
    },

    markAccepted(inviteId: UserInviteId, acceptedAt: Date) {
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

    markDelivered(inviteId: UserInviteId, deliveredAt: Date) {
      return db
        .updateTable("user_invites")
        .set({ last_delivered_at: deliveredAt })
        .where("id", "=", inviteId)
        .executeTakeFirst();
    },
  };
}

export type UserInvitesRepo = ReturnType<typeof createUserInvitesRepo>;
