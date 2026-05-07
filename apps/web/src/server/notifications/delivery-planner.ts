import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

import { resolveAudience } from "./audience";
import type { NotificationAudience, NotificationChannel } from "./types";

export type NotificationOutboxEntry = {
  id: string;
  event_type: string;
  audience_json: string;
  channels_json: string;
};

export type PlannedExternalDelivery = {
  userId: number;
  channel: "email" | "whatsapp";
  recipientAddress: string;
};

export type PlannedDeliveries = {
  recipients: number[];
  inAppRecipients: number[];
  externalDeliveries: PlannedExternalDelivery[];
};

async function loadVerifiedAddressMap(
  db: Kysely<Database>,
  recipients: number[],
  channel: "email" | "whatsapp",
): Promise<Map<number, string>> {
  if (recipients.length === 0) return new Map();

  const rows = await db
    .selectFrom("user_channel_addresses")
    .select(["user_id", "address"])
    .where("channel", "=", channel)
    .where("is_verified", "=", 1)
    .where("user_id", "in", recipients)
    .execute();

  return new Map(rows.map((row) => [row.user_id, row.address]));
}

function parseAudience(entry: NotificationOutboxEntry): NotificationAudience {
  // oxlint-disable-next-line no-unsafe-type-assertion
  return JSON.parse(entry.audience_json) as NotificationAudience;
}

function parseChannels(entry: NotificationOutboxEntry): NotificationChannel[] {
  // oxlint-disable-next-line no-unsafe-type-assertion
  return JSON.parse(entry.channels_json) as NotificationChannel[];
}

export async function planDeliveries(
  db: Kysely<Database>,
  entry: NotificationOutboxEntry,
): Promise<PlannedDeliveries> {
  const audience = parseAudience(entry);
  const channels = parseChannels(entry);
  const recipients = await resolveAudience(db, audience);

  const inAppRecipients = channels.includes("in_app") ? recipients : [];

  const externalChannels = channels.filter(
    (channel): channel is "email" | "whatsapp" => channel !== "in_app",
  );

  const externalDeliveries: PlannedExternalDelivery[] = [];
  const addressMaps = await Promise.all(
    externalChannels.map(async (channel) => ({
      channel,
      addresses: await loadVerifiedAddressMap(db, recipients, channel),
    })),
  );

  for (const { channel, addresses } of addressMaps) {
    for (const userId of recipients) {
      const recipientAddress = addresses.get(userId);
      if (!recipientAddress) continue;
      externalDeliveries.push({ userId, channel, recipientAddress });
    }
  }

  return {
    recipients,
    inAppRecipients,
    externalDeliveries,
  };
}
