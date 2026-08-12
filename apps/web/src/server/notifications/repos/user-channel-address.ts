import type { Insertable, Kysely } from "kysely";

import type { UserId } from "~/domain/ids";
import type { Phone } from "~/domain/phone/pe-mobile";
import type {
  Database,
  UserChannelAddressesTable,
} from "~/server/platform/database/types";

type ChannelType = UserChannelAddressesTable["channel"];

export function createUserChannelAddressRepo(db: Kysely<Database>) {
  const listByUser = (userId: UserId) =>
    db
      .selectFrom("user_channel_addresses")
      .selectAll()
      .where("user_id", "=", userId)
      .orderBy("created_at", "asc")
      .execute();

  // Only verified channels are deliverable (email at onboarding, whatsapp via
  // /verificar).
  const listVerifiedChannels = async (
    userId: UserId,
  ): Promise<ChannelType[]> => {
    const rows = await db
      .selectFrom("user_channel_addresses")
      .select("channel")
      .where("user_id", "=", userId)
      .where("is_verified", "=", true)
      .execute();
    return rows.map((row) => row.channel);
  };

  const findByUserAndChannel = (userId: UserId, channel: ChannelType) =>
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
    userId: UserId;
    address: Phone;
    claimedAt: Date;
  }): Promise<
    { kind: "claimed" } | { kind: "already_claimed"; ownerUserId: UserId }
  > => {
    const updateResult = await db
      .updateTable("user_channel_addresses")
      .set({
        address: values.address,
        is_verified: false,
        verified_at: null,
        updated_at: values.claimedAt,
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
        is_verified: false,
        verified_at: null,
        created_at: values.claimedAt,
        updated_at: values.claimedAt,
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

  // Only flips the row when (user_id, channel) and the supplied address match
  // the existing claim, so a stale command from a different number can't
  // accidentally verify a fresh one.
  const markWhatsAppVerified = async (values: {
    userId: UserId;
    address: string;
    verifiedAt: Date;
  }): Promise<boolean> => {
    const result = await db
      .updateTable("user_channel_addresses")
      .set({
        is_verified: true,
        verified_at: values.verifiedAt,
        updated_at: values.verifiedAt,
      })
      .where("user_id", "=", values.userId)
      .where("channel", "=", "whatsapp")
      .where("address", "=", values.address)
      .where("is_verified", "!=", true)
      .executeTakeFirst();
    return Number(result.numUpdatedRows ?? 0) > 0;
  };

  return {
    listByUser,
    listVerifiedChannels,
    findByUserAndChannel,
    findByChannelAndAddress,
    upsert,
    claimWhatsAppAddress,
    markWhatsAppVerified,
  };
}

type UserChannelAddressRepo = ReturnType<typeof createUserChannelAddressRepo>;
