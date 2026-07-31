import type { APIEvent } from "@solidjs/start/server";

import {
  realtimeErrorResponse,
  resolveRealtimeEntry,
} from "~/server/realtime/access";
import { ensureRealtimeStarted } from "~/server/realtime/runtime";
import { openRealtimeStream } from "~/server/realtime/stream";
import { isErr } from "~/shared/result";

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
    event.request.headers.get("last-event-id"),
  );

  return stream ?? realtimeErrorResponse("not_found");
}
