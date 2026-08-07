import type { Kysely } from "kysely";

import type { UserId } from "~/domain/ids";
import type { Database } from "~/server/platform/database/types";

import { resolveAudience } from "../audience";
import type { NotificationAudience, NotificationChannel } from "../types";
import { filterUsersWithActiveSession } from "../whatsapp-session";

export interface RecipientRepository {
  resolveAudience(audience: NotificationAudience): Promise<UserId[]>;
  findVerifiedAddresses(
    userIds: UserId[],
    channel: Exclude<NotificationChannel, "in_app">,
  ): Promise<Map<UserId, string>>;
  findActiveWhatsAppUsers(
    userIds: UserId[],
    activeAsOf: Date,
  ): Promise<Set<UserId>>;
}

export function createRecipientRepository(
  db: Kysely<Database>,
): RecipientRepository {
  return {
    resolveAudience: (audience) => resolveAudience(db, audience),

    async findVerifiedAddresses(userIds, channel) {
      if (userIds.length === 0) {
        return new Map();
      }

      const rows = await db
        .selectFrom("user_channel_addresses")
        .select(["user_id", "address"])
        .where("channel", "=", channel)
        .where("is_verified", "=", true)
        .where("user_id", "in", userIds)
        .execute();

      return new Map(rows.map((row) => [row.user_id, row.address]));
    },

    findActiveWhatsAppUsers: (userIds, activeAsOf) =>
      filterUsersWithActiveSession(db, userIds, activeAsOf),
  };
}
