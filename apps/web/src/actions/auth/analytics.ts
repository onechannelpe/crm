"use server";

import type { AuthFunnelClientEventPayload } from "~/domain/observability/auth-funnel";
import {
  isAuthAnalyticsScreen,
  recordAuthAnalyticsEvent as recordAuthAnalytics,
} from "~/server/auth/auth-analytics";
import { getAuthRuntime } from "~/server/platform/container/auth-runtime";
import { infra } from "~/server/platform/container/infra";
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
  const event = readClientAuthAnalyticsEvent(input);
  await recordAuthAnalytics(
    {
      source: "client",
      ...event,
    },
    getActionRequestContext(),
    getAuthRuntime().analytics,
    infra.now,
  );
}
