import type { Insertable, Kysely } from "kysely";

import type { Database, UserChannelAddressesTable } from "~/lib/db/types";
import type { Phone } from "~/lib/phone/pe-mobile";

type ChannelType = UserChannelAddressesTable["channel"];

export function createUserChannelAddressRepo(db: Kysely<Database>) {
  const listByUser = (userId: number) =>
    db
      .selectFrom("user_channel_addresses")
      .selectAll()
      .where("user_id", "=", userId)
      .orderBy("created_at", "asc")
      .execute();

  const findByUserAndChannel = (userId: number, channel: ChannelType) =>
    db
      .selectFrom("user_channel_addresses")
      .selectAll()
      .where("user_id", "=", userId)
      .where("channel", "=", channel)
      .executeTakeFirst();

  const findByChannelAndAddress = (channel: ChannelType, address: string) =>
    db
      .selectFrom("user_channel_addresses")
      .selectAll()
      .where("channel", "=", channel)
      .where("address", "=", address)
      .executeTakeFirst();

  const upsert = (values: Insertable<UserChannelAddressesTable>) =>
    db
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

  const claimWhatsAppAddress = async (values: {
    userId: number;
    address: Phone;
    now: number;
  }): Promise<
    { kind: "claimed" } | { kind: "already_claimed"; ownerUserId: number }
  > => {
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
      throw new Error(
        `WhatsApp claim resolved without owner: userId=${values.userId} address=${values.address}`,
      );
    }

    if (owner.user_id !== values.userId) {
      return { kind: "already_claimed", ownerUserId: owner.user_id };
    }

    return { kind: "claimed" };
  };

  // Confirms ownership of an address the user already claimed. Only flips
  // the row when the (user_id, channel) match the existing claim and the
  // supplied address matches what's stored, so a stale command from a
  // different number can't accidentally verify a fresh one.
  const markWhatsAppVerified = async (values: {
    userId: number;
    address: string;
    now: number;
  }): Promise<boolean> => {
    const result = await db
      .updateTable("user_channel_addresses")
      .set({
        is_verified: 1,
        verified_at: values.now,
        updated_at: values.now,
      })
      .where("user_id", "=", values.userId)
      .where("channel", "=", "whatsapp")
      .where("address", "=", values.address)
      .where("is_verified", "!=", 1)
      .executeTakeFirst();
    return Number(result.numUpdatedRows ?? 0) > 0;
  };

  return {
    listByUser,
    findByUserAndChannel,
    findByChannelAndAddress,
    upsert,
    claimWhatsAppAddress,
    markWhatsAppVerified,
  };
}

export type UserChannelAddressRepo = ReturnType<
  typeof createUserChannelAddressRepo
>;
