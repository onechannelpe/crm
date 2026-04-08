import { RedisClient } from "bun";

import { createLogger } from "~/lib/observability/logger";

const logger = createLogger("redis-publisher");

let publisher: RedisClient | null = null;

/**
 * Returns a shared RedisClient instance for publishing messages.
 * Connection is opened lazily on first use.
 */
export function getPublisher(): RedisClient {
  if (!publisher) {
    const url = process.env.REDIS_URL || "redis://localhost:6379";
    logger.info("initializing_publisher", { url });
    publisher = new RedisClient(url);
  }
  return publisher;
}

/**
 * Publishes a message to a channel.
 */
export async function publishJob(channel: string, jobId: number) {
  try {
    const client = getPublisher();
    await client.publish(channel, String(jobId));
  } catch (err: any) {
    logger.error("publish_failed", { channel, jobId, error: err.message });
    // This is fine; the fallback poll will pick it up within 30s
  }
}
