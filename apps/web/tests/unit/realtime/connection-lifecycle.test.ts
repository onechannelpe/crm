import { afterEach, describe, expect, it, vi } from "vitest";

import {
  startConnection,
  type ConnectionState,
  type RealtimeStreamSource,
  type StreamMessageEvent,
} from "~/browser/realtime/connection-lifecycle";
import {
  REALTIME_CHANNELS,
  type RealtimeMessage,
} from "~/contracts/realtime/channel";

class FakeEventSource implements RealtimeStreamSource {
  static instances: FakeEventSource[] = [];

  readyState = 0;
  closed = false;

  private readonly listeners = new Map<
    string,
    ((event: StreamMessageEvent) => void)[]
  >();

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(
    type: string,
    listener: (event: StreamMessageEvent) => void,
  ): void {
    const existing = this.listeners.get(type) ?? [];

    existing.push(listener);
    this.listeners.set(type, existing);
  }

  close(): void {
    this.closed = true;
    this.readyState = 2;
  }

  emitOpen(): void {
    this.readyState = 1;
    this.emit("open");
  }

  emitMessage(data: string, lastEventId = ""): void {
    this.readyState = 1;
    this.emit("message", { data, lastEventId });
  }

  // EventSource reaches CLOSED only after giving up reconnecting.
  emitFatalError(): void {
    this.readyState = 2;
    this.emit("error");
  }

  emitTransientError(): void {
    this.readyState = 0;
    this.emit("error");
  }

  private emit(
    type: string,
    event: StreamMessageEvent = { data: "", lastEventId: "" },
  ): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

function latestSource(): FakeEventSource {
  const source = FakeEventSource.instances.at(-1);

  if (!source) {
    throw new Error("no stream was opened");
  }

  return source;
}

function connect() {
  const received: RealtimeMessage[] = [];
  const states: ConnectionState[] = [];

  const dispose = startConnection({
    channel: REALTIME_CHANNELS.recordImport,
    id: "job-1",
    onMessage: (message) => received.push(message),
    openEventSource: (url) => new FakeEventSource(url),
    setState: (state) => states.push(state),
  });

  return {
    received,
    states,
    dispose,
    state: () => states.at(-1),
  };
}

function useFixedJitter(): void {
  // Fix the jitter so reconnect delays are deterministic.
  vi.spyOn(Math, "random").mockReturnValue(0.5);
}

afterEach(() => {
  FakeEventSource.instances = [];
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("startConnection", () => {
  it("opens the stream for its topic and reports live on the first message", () => {
    const connection = connect();

    expect(latestSource().url).toBe(
      "/api/realtime/records-import/job-1/stream",
    );

    latestSource().emitOpen();
    latestSource().emitMessage('{"rows":1}', "cursor-1");

    expect(connection.state()).toBe("live");
    expect(connection.received).toEqual([
      { data: '{"rows":1}', id: "cursor-1" },
    ]);

    connection.dispose();
  });

  it("keeps waiting through a drop the browser retries itself", () => {
    const connection = connect();

    latestSource().emitOpen();
    latestSource().emitTransientError();

    expect(connection.state()).toBe("connecting");
    expect(FakeEventSource.instances).toHaveLength(1);

    connection.dispose();
  });

  it("reports offline and reopens from the last cursor once the browser gives up", async () => {
    vi.useFakeTimers();
    useFixedJitter();

    const connection = connect();

    latestSource().emitMessage('{"rows":1}', "cursor-1");
    latestSource().emitFatalError();

    expect(connection.state()).toBe("offline");
    expect(FakeEventSource.instances).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1_000);

    expect(latestSource().url).toBe(
      "/api/realtime/records-import/job-1/stream?cursor=cursor-1",
    );
    expect(connection.state()).toBe("connecting");

    connection.dispose();
  });

  it("backs off exponentially up to the cap while the stream keeps being refused", async () => {
    vi.useFakeTimers();
    useFixedJitter();

    const connection = connect();
    const schedule = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000];

    for (const [attempt, delay] of schedule.entries()) {
      latestSource().emitFatalError();

      expect(connection.state()).toBe("offline");

      // One tick early: the reconnect should not have happened yet.
      // eslint-disable-next-line no-await-in-loop
      await vi.advanceTimersByTimeAsync(delay - 1);

      expect(FakeEventSource.instances).toHaveLength(attempt + 1);

      // eslint-disable-next-line no-await-in-loop
      await vi.advanceTimersByTimeAsync(1);

      expect(FakeEventSource.instances).toHaveLength(attempt + 2);
    }

    connection.dispose();
  });

  it("resets the backoff after a stream opens successfully", async () => {
    vi.useFakeTimers();
    useFixedJitter();

    const connection = connect();

    for (const delay of [1_000, 2_000, 4_000]) {
      latestSource().emitFatalError();

      // eslint-disable-next-line no-await-in-loop
      await vi.advanceTimersByTimeAsync(delay);
    }

    latestSource().emitOpen();

    const beforeLastFailure = FakeEventSource.instances.length;

    latestSource().emitFatalError();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(FakeEventSource.instances).toHaveLength(beforeLastFailure + 1);

    connection.dispose();
  });

  it("closes the stream and cancels a pending reconnect when disposed", async () => {
    vi.useFakeTimers();

    const connection = connect();

    latestSource().emitFatalError();

    const opened = FakeEventSource.instances.length;

    connection.dispose();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(latestSource().closed).toBe(true);
    expect(FakeEventSource.instances).toHaveLength(opened);
  });
});
