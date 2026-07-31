import { describe, expect, it } from "vitest";

import type { RealtimeMessage } from "~/contracts/realtime/channel";
import { TopicHub, type RealtimePeer } from "~/server/realtime/topic-hub";

interface FakePeer extends RealtimePeer {
  received: RealtimeMessage[];
  pings: number;
  closed: boolean;
}

// Mirrors the real peer, which leaves the hub only once its stream reports
// closed.
function createFakePeer(hub: TopicHub): FakePeer {
  const peer: FakePeer = {
    received: [],
    pings: 0,
    closed: false,
    send: (message) => peer.received.push(message),
    ping: () => {
      peer.pings += 1;
    },
    close: () => {
      peer.closed = true;
      hub.remove(peer);
    },
  };

  return peer;
}

describe("TopicHub", () => {
  it("delivers a broadcast only to peers on that topic", () => {
    const hub = new TopicHub();
    const subscriber = createFakePeer(hub);
    const bystander = createFakePeer(hub);

    hub.subscribe(subscriber, "jobs.a", 0);
    hub.subscribe(bystander, "jobs.b", 0);
    hub.broadcast("jobs.a", { data: "progress" });

    expect(subscriber.received).toEqual([{ data: "progress" }]);
    expect(bystander.received).toEqual([]);
  });

  it("stops delivering to a removed peer", () => {
    const hub = new TopicHub();
    const peer = createFakePeer(hub);

    hub.subscribe(peer, "jobs.a", 0);
    hub.remove(peer);
    hub.broadcast("jobs.a", { data: "progress" });

    expect(peer.received).toEqual([]);
  });

  it("closes every peer so clients reconnect after a missed notification", () => {
    const hub = new TopicHub();
    const first = createFakePeer(hub);
    const second = createFakePeer(hub);

    hub.subscribe(first, "jobs.a", 0);
    hub.subscribe(second, "jobs.b", 0);
    hub.closeAll();
    hub.broadcast("jobs.a", { data: "late" });

    expect(first.closed).toBe(true);
    expect(second.closed).toBe(true);
    expect(first.received).toEqual([]);
  });

  it("pings live streams and closes ones past the maximum age", () => {
    const hub = new TopicHub();
    const fresh = createFakePeer(hub);
    const expired = createFakePeer(hub);

    hub.subscribe(fresh, "jobs.a", 9_000);
    hub.subscribe(expired, "jobs.b", 0);
    hub.sweep(10_000, 10_000);

    expect(fresh.pings).toBe(1);
    expect(fresh.closed).toBe(false);
    expect(expired.closed).toBe(true);
    expect(expired.pings).toBe(0);
  });
});
