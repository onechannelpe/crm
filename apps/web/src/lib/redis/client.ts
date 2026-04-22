import { RedisClient } from "bun";

import { createLogger } from "~/lib/observability/logger";

const logger = createLogger("redis-client");

let publisherClient: RedisClient | null = null;
let subscriberClient: RedisClient | null = null;

function redisUrl(): string {
  return process.env.REDIS_URL || "redis://localhost:6379";
}

export function getRedisPublisherClient(): RedisClient {
  if (!publisherClient) {
    const url = redisUrl();
    logger.info("initializing_publisher", { url });
    publisherClient = new RedisClient(url);
  }

  return publisherClient;
}

export function getRedisSubscriberClient(): RedisClient {
  if (!subscriberClient) {
    const url = redisUrl();
    logger.info("initializing_subscriber", { url });
    subscriberClient = new RedisClient(url);
  }

  return subscriberClient;
}
