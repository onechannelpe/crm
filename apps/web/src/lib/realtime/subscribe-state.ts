import { createEventSourceStream } from "./event-source-stream";

const POLL_INTERVAL_MS = 2_000;

export interface StateSubscription {
  stop: () => void;
}

// SSE is primary. Polling starts only when the initial connection never opens.
// Events are complete snapshots, so reconnecting or missing an event is safe.
export function subscribeState<TEvent>(options: {
  streamUrl: string;
  parse: (raw: string) => TEvent | null;
  fetchLatest: () => Promise<TEvent>;
  onEvent: (event: TEvent) => void;
  until: (event: TEvent) => boolean;
}): StateSubscription {
  let stopped = false;
  let pollTimer: number | null = null;

  const stream = createEventSourceStream({
    onMessage: (raw) => {
      const event = options.parse(raw);

      if (event) {
        deliver(event);
      }
    },
    onNeverConnected: () => {
      void poll();
    },
  });

  function stop(): void {
    if (stopped) {
      return;
    }

    stopped = true;

    if (pollTimer !== null) {
      window.clearTimeout(pollTimer);
    }

    stream.disconnect();
  }

  // Stop before delivering a terminal event so nothing can follow it.
  function deliver(event: TEvent): void {
    if (stopped) {
      return;
    }

    if (options.until(event)) {
      stop();
    }

    options.onEvent(event);
  }

  async function poll(): Promise<void> {
    if (stopped) {
      return;
    }

    let event: TEvent | null = null;

    try {
      event = await options.fetchLatest();
    } catch {
      // Retry transient failures on the next poll.
    }

    if (stopped) {
      return;
    }

    if (event) {
      deliver(event);
    }

    if (stopped) {
      return;
    }

    pollTimer = window.setTimeout(() => {
      void poll();
    }, POLL_INTERVAL_MS);
  }

  stream.connect(options.streamUrl);

  return { stop };
}
