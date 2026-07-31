import { EventSourceParserStream } from "eventsource-parser/stream";

import type { RealtimeMessage } from "~/contracts/realtime/channel";

// `fetch` exposes the response status; EventSource does not.
export type StreamOutcome =
  | { kind: "closed" }
  | { kind: "denied"; status: number }
  | { kind: "failed" };

export interface ReadRealtimeStreamParams {
  url: string;
  cursor: string | null;
  signal: AbortSignal;
  onOpen: () => void;
  onMessage: (message: RealtimeMessage) => void;
}

export type ReadRealtimeStream = (
  params: ReadRealtimeStreamParams,
) => Promise<StreamOutcome>;

function requestHeaders(cursor: string | null): HeadersInit {
  const headers: Record<string, string> = {
    accept: "text/event-stream",
  };

  if (cursor !== null) {
    headers["last-event-id"] = cursor;
  }

  return headers;
}

// Aborts are reported as failures because callers ignore the result on teardown.
export async function readRealtimeStream(
  params: ReadRealtimeStreamParams,
): Promise<StreamOutcome> {
  let response: Response;

  try {
    response = await fetch(params.url, {
      headers: requestHeaders(params.cursor),
      signal: params.signal,
      cache: "no-store",
    });
  } catch {
    return { kind: "failed" };
  }

  // Authentication and topic access errors will not succeed on retry.
  if (response.status === 401 || response.status === 404) {
    return { kind: "denied", status: response.status };
  }

  if (!response.ok || !response.body) {
    return { kind: "failed" };
  }

  params.onOpen();

  const events = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream());

  try {
    for await (const event of events) {
      params.onMessage({
        data: event.data,
        id: event.id,
      });
    }
  } catch {
    return { kind: "failed" };
  }

  return { kind: "closed" };
}
