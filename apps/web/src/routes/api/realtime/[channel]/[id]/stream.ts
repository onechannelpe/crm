import type { APIEvent } from "@solidjs/start/server";

import { application } from "~/server/composition/application";
import { isErr } from "~/shared/result";

export async function GET(
  event: Pick<APIEvent, "params" | "request" | "nativeEvent">,
) {
  const stream = await application.realtime.openStream(event.nativeEvent, {
    channel: event.params.channel,
    id: event.params.id,
    cursor: event.request.headers.get("last-event-id"),
  });

  if (isErr(stream)) {
    return new Response(null, {
      status:
        stream.error === "unauthenticated"
          ? 401
          : stream.error === "not_found"
            ? 404
            : 503,
    });
  }

  return stream.value;
}
