import type { AuthFunnelClientEventPayload } from "~/domain/observability/auth-funnel";
import {
  isAuthAnalyticsScreen,
  recordAuthAnalyticsEvent as recordAuthAnalytics,
} from "~/server/auth/auth-analytics";
import { composeAuth } from "~/server/auth/ui/composition";
import { serverInfrastructure } from "~/server/platform/composition/infrastructure";
import { getActionRequestContext } from "~/server/platform/observability/context";

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
      input.code === "server_error")
  ) {
    return input;
  }

  throw new Error("Unsupported auth analytics event");
}

export async function trackAuthClientEvent(
  input: AuthFunnelClientEventPayload,
): Promise<void> {
  "use server";

  const event = readClientAuthAnalyticsEvent(input);
  await recordAuthAnalytics(
    {
      source: "client",
      ...event,
    },
    getActionRequestContext(),
    composeAuth().analytics,
    serverInfrastructure.now,
  );
}
