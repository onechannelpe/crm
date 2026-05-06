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
  };
}

export type UserChannelAddressRepo = ReturnType<
  typeof createUserChannelAddressRepo
>;
