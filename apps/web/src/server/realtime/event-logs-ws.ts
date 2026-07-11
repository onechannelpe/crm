import { defineWebSocketHandler } from "h3";
import type { WebSocketMessage } from "h3";

import { hasPermission } from "~/lib/auth/access/rbac";
import { parseRealtimeSubscriptionMessage } from "~/lib/realtime/ws-protocol";
import {
  ensureEventLogsRealtimeBridge,
  getEventLogsTopicHub,
} from "~/server/event-logs/realtime";
import {
  eventLogTopic,
  parseEventLogTopic,
} from "~/server/event-logs/stream-contract";

import { readPeerSession, resolvePeerSession } from "./core/ws-auth";
import type { WsPeer } from "./core/ws-types";

function messageText(message: WebSocketMessage): string {
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

const hub = getEventLogsTopicHub();

export default defineWebSocketHandler({
  async open(peer: WsPeer) {
    const session = await resolvePeerSession(peer);
    if (
      !session ||
      session.sessionClass !== "app" ||
      !session.onboardingCompleted ||
      !hasPermission(session.role, "audit:read")
    ) {
      peer.close();
      return;
    }
    peer.context.session = session;
  },

  async message(peer: WsPeer, message: WebSocketMessage) {
    const session = readPeerSession(peer);
    if (!session) {
      peer.close();
      return;
    }

    const parsed = parseRealtimeSubscriptionMessage(messageText(message));
    if (!parsed) return;

    const table = parseEventLogTopic(parsed.topic);
    if (table === null) return;

    const topic = eventLogTopic(table);

    if (parsed.type === "unsubscribe") {
      hub.unsubscribe(peer, topic);
      return;
    }

    try {
      await ensureEventLogsRealtimeBridge();
      hub.subscribe(peer, topic);
    } catch (err) {
      console.error("[ws] event-logs subscribe error", err);
    }
  },

  error(peer: WsPeer, err: Error) {
    console.error("[ws] event-logs peer error", peer.id, err);
  },

  close(peer: WsPeer) {
    hub.removePeer(peer);
  },
});
