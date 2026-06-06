import { defineWebSocketHandler } from "h3";
import type { WebSocketMessage } from "h3";

import {
  parseRecordImportTopic,
  recordImportTopic,
} from "~/features/records-imports/contracts";
import { hasPermission } from "~/lib/auth/access/rbac";
import { parseRealtimeSubscriptionMessage } from "~/lib/realtime/ws-protocol";
import { canAccessRecordImportJob } from "~/server/records/imports/api";
import { buildRecordImportProgressEvent } from "~/server/records/imports/progress-events";
import {
  ensureRecordImportsRealtimeBridge,
  getRecordImportsTopicHub,
} from "~/server/records/imports/realtime";
import { getServerRuntime } from "~/server/runtime";

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

const hub = getRecordImportsTopicHub();

export default defineWebSocketHandler({
  async open(peer: WsPeer) {
    const session = await resolvePeerSession(peer);
    if (
      !session ||
      session.sessionClass !== "app" ||
      !session.onboardingCompleted ||
      !hasPermission(session.role, "integration:manage")
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

    const jobId = parseRecordImportTopic(parsed.topic);
    if (jobId === null) return;

    const topic = recordImportTopic(jobId);

    if (parsed.type === "unsubscribe") {
      hub.unsubscribe(peer, topic);
      return;
    }

    try {
      await ensureRecordImportsRealtimeBridge();
      const integration = getServerRuntime().integrations.integration;
      const job = await integration.jobs.findById(jobId);

      if (job?.type !== "import_status" && job?.type !== "import_prioridad") {
        return;
      }

      const canAccess = await canAccessRecordImportJob(
        {
          userId: session.userId,
          branchId: session.branchId,
          role: session.role,
        },
        job,
        integration,
      );
      if (!canAccess) return;

      hub.subscribe(peer, topic);
      peer.send(JSON.stringify(buildRecordImportProgressEvent({ job })));
    } catch (err) {
      console.error("[ws] subscribe error", err);
    }
  },

  error(peer: WsPeer, err: Error) {
    console.error("[ws] peer error", peer.id, err);
  },

  close(peer: WsPeer) {
    hub.removePeer(peer);
  },
});
