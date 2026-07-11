import {
  isAuthFunnelScreen,
  type AuthFunnelEvent,
  type AuthFunnelScreen,
} from "~/lib/observability/auth-funnel";
import type { ActionRequestContext } from "~/lib/observability/context";
import { getServerRuntime } from "~/server/platform/container";

export function isAuthAnalyticsScreen(
  value: unknown,
): value is AuthFunnelScreen {
  return isAuthFunnelScreen(value);
}

export function recordAuthAnalyticsEvent(
  event: AuthFunnelEvent,
  requestContext: ActionRequestContext,
): Promise<void> {
  const { observabilityService } = getServerRuntime().observability;
  return observabilityService.recordAuthFunnelEvent({
    traceId: requestContext.traceId,
    requestId: requestContext.requestId,
    routePath: requestContext.routePath,
    source: event.source,
    eventName: event.kind,
    screen: resolveEventScreen(event),
    method: resolveEventMethod(event),
    outcome: resolveEventOutcome(event),
    code: resolveEventCode(event),
    createdAt: new Date(),
  });
}

function resolveEventScreen(event: AuthFunnelEvent) {
  if (event.kind === "screen_viewed") {
    return event.screen;
  }
  return null;
}

function resolveEventMethod(event: AuthFunnelEvent) {
  switch (event.kind) {
    case "screen_viewed":
      if (event.screen === "login_verify") return "password_totp";
      if (event.screen === "login_user") return "password";
      if (event.screen === "login_passkey") {
        return "passkey";
      }
      return null;
    case "password_result":
      return "password";
    case "passkey_start_result":
    case "passkey_result":
      return "passkey";
    case "totp_result":
      return "password_totp";
    default:
      event satisfies never;
      return null;
  }
}

function resolveEventOutcome(event: AuthFunnelEvent) {
  if (event.kind === "screen_viewed") {
    return "viewed";
  }
  return event.outcome;
}

function resolveEventCode(event: AuthFunnelEvent) {
  if ("code" in event) {
    return event.code;
  }
  return null;
}
