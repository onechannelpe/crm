import type { APIEvent } from "@solidjs/start/server";

import {
  realtimeErrorResponse,
  resolveRealtimeEntry,
} from "~/server/realtime/access";
import { ensureRealtimeStarted } from "~/server/realtime/runtime";
import { openRealtimeStream } from "~/server/realtime/stream";
import { isErr } from "~/shared/result";

// Browser retries send Last-Event-ID. Explicit reconnects use the URL cursor.
// Prefer the header because it reflects the latest received event.
function readCursor(request: Request): string | null {
  return (
    request.headers.get("last-event-id") ??
    new URL(request.url).searchParams.get("cursor")
  );
}

export async function GET(
  event: Pick<APIEvent, "params" | "request" | "nativeEvent">,
) {
  const entry = await resolveRealtimeEntry(
    event.params.channel,
    event.params.id,
  );

  if (isErr(entry)) {
    return realtimeErrorResponse(entry.error);
  }

  await ensureRealtimeStarted();

  const stream = await openRealtimeStream(
    event.nativeEvent,
    entry.value,
    readCursor(event.request),
  );

  // h3 writes the stream and its headers.
  return stream ?? realtimeErrorResponse("not_found");
}
