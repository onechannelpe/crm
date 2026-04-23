import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { createLogger } from "~/lib/observability/logger";
import { subscribeRedisChannel } from "~/lib/redis/subscriber";

const logger = createLogger("queue-doorbell-subscriber");

export async function startQueueDoorbellSubscriber(triggers: {
  [K in keyof typeof JOB_CHANNELS]?: () => void;
}) {
  const channelEntries = [
    { key: "LEADS_IMPORT", channel: JOB_CHANNELS.LEADS_IMPORT },
    {
      key: "INTEGRATION_OUTBOX_NEEDS_EXECUTIVE_INPUT",
      channel: JOB_CHANNELS.INTEGRATION_OUTBOX_NEEDS_EXECUTIVE_INPUT,
    },
    {
      key: "INTEGRATION_OUTBOX_READY_FOR_QUOTATION",
      channel: JOB_CHANNELS.INTEGRATION_OUTBOX_READY_FOR_QUOTATION,
    },
    { key: "ENRICHMENT", channel: JOB_CHANNELS.ENRICHMENT },
    {
      key: "ENRICHMENT_WRITEBACK",
      channel: JOB_CHANNELS.ENRICHMENT_WRITEBACK,
    },
    {
      key: "NOTIFICATIONS_EMAIL",
      channel: JOB_CHANNELS.NOTIFICATIONS_EMAIL,
    },
    {
      key: "NOTIFICATIONS_WHATSAPP",
      channel: JOB_CHANNELS.NOTIFICATIONS_WHATSAPP,
    },
  ] as const;

  await Promise.all(
    channelEntries.map(async ({ key, channel }) => {
      await subscribeRedisChannel(channel, () => {
        const trigger = triggers[key];
        if (!trigger) {
          return;
        }
        logger.debug("queue_doorbell_received", { channel, key });
        trigger();
      });
    }),
  );

  logger.info("queue_doorbell_listening", {
    channels: channelEntries.map((entry) => entry.channel),
  });
}
