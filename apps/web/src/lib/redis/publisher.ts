import type { JobChannel } from "~/lib/job-queue/channels";
import { createLogger } from "~/lib/observability/logger";

import { getRedisPublisherClient } from "./client";

const logger = createLogger("redis-publisher");

/**
 * Publish a job-id reference. The subscriber refetches the job from the DB,
 * so the wire value is just the id. Fire-and-forget: on failure the worker's
 * fallback polling still picks the job up.
 */
export async function publishJobId(channel: JobChannel, id: string | number) {
  try {
    await getRedisPublisherClient().publish(channel, String(id));
  } catch (error: unknown) {
    logger.error("publish_job_id_failed", {
      channel,
      id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Publish an inline payload that travels on the channel itself (the subscriber
 * does not refetch). Fire-and-forget: dropped messages are tolerable for the
 * ephemeral progress/wake signals that use this.
 */
export async function publishMessage(channel: JobChannel, payload: unknown) {
  try {
    await getRedisPublisherClient().publish(channel, JSON.stringify(payload));
  } catch (error: unknown) {
    logger.error("publish_message_failed", {
      channel,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
