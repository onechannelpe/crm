import type { Insertable, Kysely } from "kysely";

import type { Database, UserChannelAddressesTable } from "~/lib/db/types";

type ChannelType = UserChannelAddressesTable["channel"];

export function createUserChannelAddressRepo(db: Kysely<Database>) {
  return {
    listByUser(userId: number) {
      return db
        .selectFrom("user_channel_addresses")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "asc")
        .execute();
    },

    findByUserAndChannel(userId: number, channel: ChannelType) {
      return db
        .selectFrom("user_channel_addresses")
        .selectAll()
        .where("user_id", "=", userId)
        .where("channel", "=", channel)
        .executeTakeFirst();
    },

    findByChannelAndAddress(channel: ChannelType, address: string) {
      return db
        .selectFrom("user_channel_addresses")
        .selectAll()
        .where("channel", "=", channel)
        .where("address", "=", address)
        .executeTakeFirst();
    },

    upsert(values: Insertable<UserChannelAddressesTable>) {
      return db
        .insertInto("user_channel_addresses")
        .values(values)
        .onConflict((oc) =>
          oc.columns(["user_id", "channel"]).doUpdateSet({
            address: values.address,
            is_verified: values.is_verified,
            verified_at: values.verified_at,
            updated_at: values.updated_at,
          }),
        )
        .execute();
    },

    async claimWhatsAppAddress(values: {
      userId: number;
      address: string;
      now: number;
    }): Promise<
      { kind: "claimed" } | { kind: "already_claimed"; ownerUserId: number }
    > {
      const updateResult = await db
        .updateTable("user_channel_addresses")
        .set({
          address: values.address,
          is_verified: 0,
          verified_at: null,
          updated_at: values.now,
        })
        .where("user_id", "=", values.userId)
        .where("channel", "=", "whatsapp")
        .where("address", "!=", values.address)
        .where((eb) =>
          eb.not(
            eb.exists(
              eb
                .selectFrom("user_channel_addresses")
                .select("id")
                .where("channel", "=", "whatsapp")
                .where("address", "=", values.address)
                .where("user_id", "!=", values.userId),
            ),
          ),
        )
        .executeTakeFirst();

      if (Number(updateResult.numUpdatedRows ?? 0) > 0) {
        return { kind: "claimed" };
      }

      await db
        .insertInto("user_channel_addresses")
        .values({
          user_id: values.userId,
          channel: "whatsapp",
          address: values.address,
          is_verified: 0,
          verified_at: null,
          created_at: values.now,
          updated_at: values.now,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();

      const owner = await db
        .selectFrom("user_channel_addresses")
        .select("user_id")
        .where("channel", "=", "whatsapp")
        .where("address", "=", values.address)
        .executeTakeFirst();

      if (!owner) {
        throw new Error("WhatsApp address claim did not resolve an owner");
      }

      if (owner.user_id !== values.userId) {
        return { kind: "already_claimed", ownerUserId: owner.user_id };
      }

      return { kind: "claimed" };
    },
  };
}

export type UserChannelAddressRepo = ReturnType<
  typeof createUserChannelAddressRepo
>;
