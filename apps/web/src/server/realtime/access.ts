import { getSession } from "~/server/platform/action/session";
import { Err, Ok, type Result } from "~/shared/result";

import type { RealtimeEntry } from "./channel";
import { findRealtimeChannel } from "./registry";

export type RealtimeAccessError = "unauthenticated" | "not_found";

export async function resolveRealtimeEntry(
  rawChannel: string,
  rawId: string,
): Promise<Result<RealtimeEntry, RealtimeAccessError>> {
  const session = await getSession();

  if (!session || session.sessionClass !== "app") {
    return Err("unauthenticated");
  }

  const channel = findRealtimeChannel(rawChannel);

  if (!channel) {
    return Err("not_found");
  }

  // The opening read also authorizes access to the record.
  const entry = channel.entry(rawId, session);

  if (!entry) {
    return Err("not_found");
  }

  return Ok(entry);
}

export function realtimeErrorResponse(error: RealtimeAccessError): Response {
  return new Response(null, {
    status: error === "unauthenticated" ? 401 : 404,
  });
}
