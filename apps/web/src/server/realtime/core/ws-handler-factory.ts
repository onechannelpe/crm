import { defineWebSocketHandler } from "h3";

import { parseRealtimeSubscriptionMessage } from "~/lib/realtime/ws-protocol";

import type { TopicHub } from "./topic-hub";
import {
  readPeerSession,
  resolvePeerSession,
  type AppPeerSession,
} from "./ws-auth";
import type { WsMessage, WsPeer } from "./ws-types";

interface TopicSubscriptionHandlerConfig<TKey> {
  hub: TopicHub;
  canOpen: (session: AppPeerSession) => boolean;
  parseTopic: (topic: string) => TKey | null;
  topicFromKey: (key: TKey) => string;
  authorizeSubscribe: (
    session: AppPeerSession,
    key: TKey,
  ) => Promise<boolean> | boolean;
  onSubscribe?: (session: AppPeerSession, key: TKey) => Promise<void> | void;
  onUnsubscribe?: (session: AppPeerSession, key: TKey) => Promise<void> | void;
  initialPayload?: (
    session: AppPeerSession,
    key: TKey,
  ) => Promise<string | null> | string | null;
}

function messageToText(message: WsMessage): string {
  if (
    typeof message === "object" &&
    message !== null &&
    "text" in message &&
    typeof message.text === "function"
  ) {
    return message.text();
  }

  return String(message);
}

export function createTopicSubscriptionWsHandler<TKey>(
  config: TopicSubscriptionHandlerConfig<TKey>,
) {
  return defineWebSocketHandler({
    async open(peer: WsPeer) {
      const session = await resolvePeerSession(peer);
      if (!session || !config.canOpen(session)) {
        peer.close();
        return;
      }

      peer.context.session = session;
    },

    async message(peer: WsPeer, message: WsMessage) {
      const session = readPeerSession(peer);
      if (!session) {
        peer.close();
        return;
      }

      const parsed = parseRealtimeSubscriptionMessage(messageToText(message));
      if (!parsed) {
        return;
      }

      const key = config.parseTopic(parsed.topic);
      if (key === null) {
        return;
      }

      const topic = config.topicFromKey(key);

      if (parsed.type === "unsubscribe") {
        config.hub.unsubscribe(peer, topic);
        if (config.onUnsubscribe) {
          await config.onUnsubscribe(session, key);
        }
        return;
      }

      const authorized = await config.authorizeSubscribe(session, key);
      if (!authorized) {
        return;
      }

      config.hub.subscribe(peer, topic);
      if (config.onSubscribe) {
        await config.onSubscribe(session, key);
      }

      if (config.initialPayload) {
        const payload = await config.initialPayload(session, key);
        if (payload) {
          peer.send(payload);
        }
      }
    },

    async close(peer: WsPeer) {
      config.hub.removePeer(peer);
    },
  });
}
