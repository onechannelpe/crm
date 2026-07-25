import type { Kysely } from "kysely";

import type { UserId } from "~/domain/ids";
import type { Database } from "~/server/platform/database/types";

import type { ExternalChannel, NotificationCategory } from "../categories";

function optOutKey(userId: UserId, channel: ExternalChannel): string {
  return `${userId}:${channel}`;
}

export interface NotificationOptOutRepo {
  findOptOuts(
    userIds: UserId[],
    category: NotificationCategory,
  ): Promise<Set<string>>;
  listForUser(
    userId: UserId,
  ): Promise<{ category: string; channel: ExternalChannel }[]>;
  setOptedOut(input: {
    userId: UserId;
    category: NotificationCategory;
    channel: ExternalChannel;
    optedOut: boolean;
    now: Date;
  }): Promise<void>;
  muteChannel(input: {
    userId: UserId;
    channel: ExternalChannel;
    categories: readonly NotificationCategory[];
    now: Date;
  }): Promise<void>;
}

export function createNotificationOptOutRepo(
  db: Kysely<Database>,
): NotificationOptOutRepo {
  return {
    async findOptOuts(userIds, category) {
      if (userIds.length === 0) return new Set();

      const rows = await db
        .selectFrom("notification_opt_outs")
        .select(["user_id", "channel"])
        .where("category", "=", category)
        .where("user_id", "in", userIds)
        .execute();

      return new Set(rows.map((row) => optOutKey(row.user_id, row.channel)));
    },

    async listForUser(userId) {
      const rows = await db
        .selectFrom("notification_opt_outs")
        .select(["category", "channel"])
        .where("user_id", "=", userId)
        .execute();

      return rows.map((row) => ({
        category: row.category,
        channel: row.channel,
      }));
    },

    async setOptedOut({ userId, category, channel, optedOut, now }) {
      if (!optedOut) {
        await db
          .deleteFrom("notification_opt_outs")
          .where("user_id", "=", userId)
          .where("category", "=", category)
          .where("channel", "=", channel)
          .execute();
        return;
      }

      await db
        .insertInto("notification_opt_outs")
        .values({ user_id: userId, category, channel, created_at: now })
        .onConflict((oc) =>
          oc.columns(["user_id", "category", "channel"]).doNothing(),
        )
        .execute();
    },

    async muteChannel({ userId, channel, categories, now }) {
      if (categories.length === 0) return;

      await db
        .insertInto("notification_opt_outs")
        .values(
          categories.map((category) => ({
            user_id: userId,
            category,
            channel,
            created_at: now,
          })),
        )
        .onConflict((oc) =>
          oc.columns(["user_id", "category", "channel"]).doNothing(),
        )
        .execute();
    },
  };
}
