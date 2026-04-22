export interface RealtimePeer {
  send: (message: string) => unknown;
}

export class TopicHub {
  private readonly peersByTopic = new Map<string, Set<RealtimePeer>>();
  private readonly topicsByPeer = new Map<RealtimePeer, Set<string>>();

  subscribe(peer: RealtimePeer, topic: string): void {
    const peers = this.peersByTopic.get(topic) ?? new Set<RealtimePeer>();
    peers.add(peer);
    this.peersByTopic.set(topic, peers);

    const topics = this.topicsByPeer.get(peer) ?? new Set<string>();
    topics.add(topic);
    this.topicsByPeer.set(peer, topics);
  }

  unsubscribe(peer: RealtimePeer, topic: string): void {
    const peers = this.peersByTopic.get(topic);
    if (peers) {
      peers.delete(peer);
      if (peers.size === 0) {
        this.peersByTopic.delete(topic);
      }
    }

    const topics = this.topicsByPeer.get(peer);
    if (!topics) {
      return;
    }

    topics.delete(topic);
    if (topics.size === 0) {
      this.topicsByPeer.delete(peer);
    }
  }

  removePeer(peer: RealtimePeer): void {
    const topics = this.topicsByPeer.get(peer);
    if (!topics) {
      return;
    }

    for (const topic of topics) {
      const peers = this.peersByTopic.get(topic);
      if (!peers) {
        continue;
      }
      peers.delete(peer);
      if (peers.size === 0) {
        this.peersByTopic.delete(topic);
      }
    }

    this.topicsByPeer.delete(peer);
  }

  broadcast(topic: string, payload: string): void {
    const peers = this.peersByTopic.get(topic);
    if (!peers || peers.size === 0) {
      return;
    }

    for (const peer of peers) {
      try {
        peer.send(payload);
      } catch {
        this.removePeer(peer);
      }
    }
  }
}
