import type { Insertable, Kysely } from "kysely";

import type { Database, NotificationChannelOwnersTable } from "~/lib/db/types";

type NewNotificationChannelOwnerRow =
  Insertable<NotificationChannelOwnersTable>;
type Channel = NotificationChannelOwnersTable["channel"];

export type ClaimChannelOwnershipResult =
  | { kind: "claimed" }
  | { kind: "already_claimed_by_self" }
  | { kind: "already_claimed_by_other"; ownerUserId: number };

export function createNotificationChannelOwnerRepo(db: Kysely<Database>) {
  return {
    listByUser(userId: number) {
      return db
        .selectFrom("notification_channel_owners")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "asc")
        .execute();
    },

    getByUserChannel(userId: number, channel: "whatsapp") {
      return db
        .selectFrom("notification_channel_owners")
        .selectAll()
        .where("user_id", "=", userId)
        .where("channel", "=", channel)
        .executeTakeFirst();
    },

    getByChannelAddress(channel: Channel, addressNormalized: string) {
      return db
        .selectFrom("notification_channel_owners")
        .selectAll()
        .where("channel", "=", channel)
        .where("address_normalized", "=", addressNormalized)
        .executeTakeFirst();
    },

    async claimWhatsAppOwnership(
      values: NewNotificationChannelOwnerRow & { channel: "whatsapp" },
    ): Promise<ClaimChannelOwnershipResult> {
      const ownerByAddress = await db
        .selectFrom("notification_channel_owners")
        .select(["user_id"])
        .where("channel", "=", "whatsapp")
        .where("address_normalized", "=", values.address_normalized)
        .executeTakeFirst();
      if (ownerByAddress && ownerByAddress.user_id !== values.user_id) {
        return {
          kind: "already_claimed_by_other",
          ownerUserId: ownerByAddress.user_id,
        };
      }
      if (ownerByAddress && ownerByAddress.user_id === values.user_id) {
        await db
          .updateTable("notification_channel_owners")
          .set({
            is_verified: values.is_verified,
            verified_at: values.verified_at,
            updated_at: values.updated_at,
          })
          .where("user_id", "=", values.user_id)
          .where("channel", "=", "whatsapp")
          .execute();
        return { kind: "already_claimed_by_self" };
      }

      try {
        await db
          .insertInto("notification_channel_owners")
          .values(values)
          .onConflict((oc) =>
            oc.columns(["user_id", "channel"]).doUpdateSet({
              address_normalized: values.address_normalized,
              is_verified: values.is_verified,
              verified_at: values.verified_at,
              updated_at: values.updated_at,
            }),
          )
          .execute();
        return { kind: "claimed" };
      } catch (error) {
        const racedOwner = await db
          .selectFrom("notification_channel_owners")
          .select(["user_id"])
          .where("channel", "=", "whatsapp")
          .where("address_normalized", "=", values.address_normalized)
          .executeTakeFirst();
        if (racedOwner && racedOwner.user_id !== values.user_id) {
          return {
            kind: "already_claimed_by_other",
            ownerUserId: racedOwner.user_id,
          };
        }
        throw error;
      }
    },
  };
}

export type NotificationChannelOwnerRepo = ReturnType<
  typeof createNotificationChannelOwnerRepo
>;
