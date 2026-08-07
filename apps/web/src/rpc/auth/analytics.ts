import {
  isAuthFunnelScreen,
  type AuthFunnelClientEventPayload,
} from "~/domain/observability/auth-funnel";
import { application } from "~/server/composition/application";
import { getRequestOperation } from "~/server/platform/http/request-context-storage";
import { getActionRequestContext } from "~/server/platform/observability/context";

function assertClientAuthAnalyticsEvent(
  input: AuthFunnelClientEventPayload,
): void {
  if (input.kind === "screen_viewed") {
    if (!isAuthFunnelScreen(input.screen)) {
      throw new Error("Invalid auth analytics screen");
    }

    return;
  }

  if (
    input.kind === "passkey_result" &&
    input.outcome === "failed" &&
    (input.code === "cancelled" ||
      input.code === "unsupported" ||
      input.code === "server_error")
  ) {
    return;
  }

  throw new Error("Unsupported auth analytics event");
}

export async function trackAuthClientEvent(
  input: AuthFunnelClientEventPayload,
): Promise<void> {
  "use server";

  assertClientAuthAnalyticsEvent(input);

  await application.auth.analytics(
    {
      source: "client",
      ...input,
    },
    getActionRequestContext(),
    getRequestOperation(),
  );
}
