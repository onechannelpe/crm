import { RedisClient } from "bun";

import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { createLogger } from "~/lib/observability/logger";
import {
  isLeadImportProgressEvent,
  type LeadImportProgressEvent,
} from "~/server/leads/imports/progress-events";

export interface BridgePeer {
  send: (message: string) => unknown;
}

const logger = createLogger("leads-imports-progress-bridge");

class LeadsImportsProgressBridge {
  private readonly peersByJobId = new Map<number, Set<BridgePeer>>();
  private readonly jobsByPeer = new Map<BridgePeer, Set<number>>();
  private subscriber: RedisClient | null = null;
  private started = false;

  async start(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;

    try {
      const url = process.env.REDIS_URL || "redis://localhost:6379";
      this.subscriber = new RedisClient(url);
      const subscribe = Reflect.get(this.subscriber, "subscribe");
      if (typeof subscribe !== "function") {
        throw new Error("Redis subscriber does not expose subscribe()");
      }

      await subscribe.call(
        this.subscriber,
        [JOB_CHANNELS.LEADS_IMPORT_PROGRESS],
        (message: string) => {
          this.handleProgressMessage(message);
        },
      );
    } catch (error: unknown) {
      logger.error("leads_import_progress_bridge_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  removePeer(peer: BridgePeer): void {
    const jobs = this.jobsByPeer.get(peer);
    if (!jobs) {
      return;
    }

    for (const jobId of jobs) {
      const peers = this.peersByJobId.get(jobId);
      if (!peers) {
        continue;
      }
      peers.delete(peer);
      if (peers.size === 0) {
        this.peersByJobId.delete(jobId);
      }
    }

    this.jobsByPeer.delete(peer);
  }

  subscribe(peer: BridgePeer, jobId: number): void {
    const peers = this.peersByJobId.get(jobId) ?? new Set<BridgePeer>();
    peers.add(peer);
    this.peersByJobId.set(jobId, peers);

    const jobs = this.jobsByPeer.get(peer) ?? new Set<number>();
    jobs.add(jobId);
    this.jobsByPeer.set(peer, jobs);
  }

  unsubscribe(peer: BridgePeer, jobId: number): void {
    const peers = this.peersByJobId.get(jobId);
    if (peers) {
      peers.delete(peer);
      if (peers.size === 0) {
        this.peersByJobId.delete(jobId);
      }
    }

    const jobs = this.jobsByPeer.get(peer);
    if (!jobs) {
      return;
    }
    jobs.delete(jobId);
    if (jobs.size === 0) {
      this.jobsByPeer.delete(peer);
    }
  }

  private handleProgressMessage(message: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }

    if (!isLeadImportProgressEvent(parsed)) {
      return;
    }
    const payload: LeadImportProgressEvent = parsed;

    const peers = this.peersByJobId.get(payload.jobId);
    if (!peers || peers.size === 0) {
      return;
    }

    const body = JSON.stringify(payload);
    for (const peer of peers) {
      try {
        peer.send(body);
      } catch {
        this.removePeer(peer);
      }
    }
  }
}

const bridge = new LeadsImportsProgressBridge();

export async function ensureLeadsImportsProgressBridge() {
  await bridge.start();
  return bridge;
}
