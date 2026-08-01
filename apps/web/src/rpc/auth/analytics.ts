import {
  isAuthFunnelScreen,
  type AuthFunnelClientEventPayload,
} from "~/domain/observability/auth-funnel";
import { application } from "~/server/platform/composition/application";
import { getRequestInstant } from "~/server/platform/http/request-context";
import { getActionRequestContext } from "~/server/platform/observability/context";

function readClientAuthAnalyticsEvent(input: AuthFunnelClientEventPayload) {
  if (input.kind === "screen_viewed") {
    if (!isAuthFunnelScreen(input.screen)) {
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
  await application.auth.analytics(
    {
      source: "client",
      ...event,
    },
    getActionRequestContext(),
    getRequestInstant(),
  );
}
