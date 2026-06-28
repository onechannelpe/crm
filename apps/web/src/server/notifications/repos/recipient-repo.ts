import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

import { resolveAudience } from "../audience";
import type { NotificationAudience, NotificationChannel } from "../types";
import { filterUsersWithActiveSession } from "../whatsapp-session";

export interface RecipientRepository {
  resolveAudience(audience: NotificationAudience): Promise<number[]>;
  findVerifiedAddresses(
    userIds: number[],
    channel: Exclude<NotificationChannel, "in_app">,
  ): Promise<Map<number, string>>;
  findActiveWhatsAppUsers(userIds: number[], now: number): Promise<Set<number>>;
}

export function createRecipientRepository(
  db: Kysely<Database>,
): RecipientRepository {
  return {
    resolveAudience: (audience) => resolveAudience(db, audience),

    async findVerifiedAddresses(userIds, channel) {
      if (userIds.length === 0) return new Map();

      const rows = await db
        .selectFrom("user_channel_addresses")
        .select(["user_id", "address"])
        .where("channel", "=", channel)
        .where("is_verified", "=", 1)
        .where("user_id", "in", userIds)
        .execute();

      return new Map(rows.map((row) => [row.user_id, row.address]));
    },

    findActiveWhatsAppUsers: (userIds, now) =>
      filterUsersWithActiveSession(db, userIds, now),
  };
}
