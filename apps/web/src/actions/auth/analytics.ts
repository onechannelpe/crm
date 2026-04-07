"use server";

import {
  isAuthAnalyticsScreen,
  recordAuthAnalyticsEvent,
} from "~/lib/auth/auth-analytics";
import type { AuthFunnelClientEventPayload } from "~/lib/observability/auth-funnel";
import { getActionRequestContext } from "~/lib/observability/context";

function readClientAuthAnalyticsEvent(input: AuthFunnelClientEventPayload) {
  if (input.kind === "screen_viewed") {
    if (!isAuthAnalyticsScreen(input.screen)) {
      throw new Error("Invalid auth analytics screen");
    }
    return input;
  }

  if (
    input.kind === "passkey_result" &&
    input.outcome === "failed" &&
    (input.code === "cancelled" ||
      input.code === "unsupported" ||
      input.code === "browser_error")
  ) {
    return input;
  }

  throw new Error("Unsupported auth analytics event");
}

export async function trackAuthClientEvent(
  input: AuthFunnelClientEventPayload,
): Promise<void> {
  const event = readClientAuthAnalyticsEvent(input);
  await recordAuthAnalyticsEvent(
    {
      source: "client",
      ...event,
    },
    getActionRequestContext(),
  );
}
