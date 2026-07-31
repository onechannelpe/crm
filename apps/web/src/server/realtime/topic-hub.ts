import type { RealtimeMessage } from "~/contracts/realtime/channel";

// send() never reports broken connections; h3 reports them through onClosed.
export interface RealtimePeer {
  send: (message: RealtimeMessage) => void;
  ping: () => void;
  close: () => void;
}

interface PeerRecord {
  topic: string;
  openedAt: number;
}

export class TopicHub {
  private readonly peers = new Map<RealtimePeer, PeerRecord>();
  private readonly peersByTopic = new Map<string, Set<RealtimePeer>>();

  subscribe(peer: RealtimePeer, topic: string, openedAt: number): void {
    this.peers.set(peer, { topic, openedAt });

    const existing = this.peersByTopic.get(topic);

    if (existing) {
      existing.add(peer);
      return;
    }

    this.peersByTopic.set(topic, new Set([peer]));
  }

  remove(peer: RealtimePeer): void {
    const record = this.peers.get(peer);

    if (!record) {
      return;
    }

    this.peers.delete(peer);

    const peers = this.peersByTopic.get(record.topic);

    if (!peers) {
      return;
    }

    peers.delete(peer);

    if (peers.size === 0) {
      this.peersByTopic.delete(record.topic);
    }
  }

  broadcast(topic: string, message: RealtimeMessage): void {
    const peers = this.peersByTopic.get(topic);

    if (!peers) {
      return;
    }

    for (const peer of peers) {
      peer.send(message);
    }
  }

  closeAll(): void {
    for (const peer of this.peers.keys()) {
      peer.close();
    }
  }

  // Keep idle connections alive. Expired connections reconnect and re-authorize.
  sweep(now: number, maxAgeMs: number): void {
    for (const [peer, record] of this.peers) {
      if (now - record.openedAt >= maxAgeMs) {
        peer.close();
        continue;
      }

      peer.ping();
    }
  }
}
