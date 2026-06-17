import { createLogger } from "~/lib/observability/logger";

import { getRedisSubscriberClient } from "./client";

const logger = createLogger("redis-subscriber");

type RedisMessageHandler = (message: string, channel: string) => void;

const handlersByChannel = new Map<string, Set<RedisMessageHandler>>();
const subscribedChannels = new Set<string>();

function resolveSubscribe() {
  const client = getRedisSubscriberClient();
  const subscribe = Reflect.get(client, "subscribe");
  if (typeof subscribe !== "function") {
    throw new Error("Redis subscriber does not expose subscribe()");
  }
  return { client, subscribe };
}

function dispatchToHandlers(message: string, channel: string): void {
  const handlers = handlersByChannel.get(channel);
  if (!handlers || handlers.size === 0) {
    return;
  }
  for (const handler of handlers) {
    handler(message, channel);
  }
}

async function ensureChannelSubscription(channel: string): Promise<void> {
  if (subscribedChannels.has(channel)) {
    return;
  }

  const { client, subscribe } = resolveSubscribe();
  await subscribe.call(client, [channel], dispatchToHandlers);
  subscribedChannels.add(channel);
}

export async function subscribeRedisChannel(
  channel: string,
  handler: RedisMessageHandler,
): Promise<() => void> {
  const handlers =
    handlersByChannel.get(channel) ?? new Set<RedisMessageHandler>();
  handlers.add(handler);
  handlersByChannel.set(channel, handlers);

  try {
    await ensureChannelSubscription(channel);
    logger.debug("subscriber_channel_registered", { channel });
  } catch {
    handlers.delete(handler);
    if (handlers.size === 0) {
      handlersByChannel.delete(channel);
    }
    throw new Error(`Failed to subscribe redis channel: ${channel}`);
  }

  return () => {
    const current = handlersByChannel.get(channel);
    if (!current) {
      return;
    }
    current.delete(handler);
    if (current.size === 0) {
      handlersByChannel.delete(channel);
    }
  };
}
