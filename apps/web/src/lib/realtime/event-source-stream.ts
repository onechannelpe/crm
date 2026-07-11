export interface EventSourceStreamHandlers {
  onMessage: (data: string) => void;
  // Fires only when the very first connection attempt never received a
  // message before closing. Ordinary drops are the browser's problem:
  // EventSource retries them natively. Callers that want a fallback
  // transport (e.g. polling) hook this, not every close/error.
  onNeverConnected?: () => void;
}

export interface EventSourceStream {
  connect: (url: string) => void;
  disconnect: () => void;
}

export function createEventSourceStream(
  handlers: EventSourceStreamHandlers,
): EventSourceStream {
  let source: EventSource | null = null;
  let waitingForFirstMessage = true;

  function disconnect(): void {
    if (!source) return;
    source.close();
    source = null;
  }

  function connect(url: string): void {
    disconnect();
    waitingForFirstMessage = true;

    const next = new EventSource(url);
    source = next;

    next.addEventListener("message", (event) => {
      waitingForFirstMessage = false;
      handlers.onMessage(event.data);
    });

    next.addEventListener("error", () => {
      if (next.readyState === EventSource.CLOSED && waitingForFirstMessage) {
        disconnect();
        handlers.onNeverConnected?.();
      }
    });
  }

  return { connect, disconnect };
}
