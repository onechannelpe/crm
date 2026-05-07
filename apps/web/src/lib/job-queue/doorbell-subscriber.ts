import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { createLogger } from "~/lib/observability/logger";
import { subscribeRedisChannel } from "~/lib/redis/subscriber";

const logger = createLogger("queue-doorbell-subscriber");

export async function startQueueDoorbellSubscriber(triggers: {
  [K in keyof typeof JOB_CHANNELS]?: () => void;
}) {
  const channelEntries = [
    { key: "RECORDS_IMPORT", channel: JOB_CHANNELS.RECORDS_IMPORT },
    {
      key: "WORKFLOW_NOTIFICATION_OUTBOX",
      channel: JOB_CHANNELS.WORKFLOW_NOTIFICATION_OUTBOX,
    },
    { key: "ENRICHMENT", channel: JOB_CHANNELS.ENRICHMENT },
    {
      key: "ENRICHMENT_WRITEBACK",
      channel: JOB_CHANNELS.ENRICHMENT_WRITEBACK,
    },
    {
      key: "NOTIFICATIONS_INTENTS",
      channel: JOB_CHANNELS.NOTIFICATIONS_INTENTS,
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
