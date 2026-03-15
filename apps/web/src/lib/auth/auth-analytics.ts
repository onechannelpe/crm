import {
  AUTH_FUNNEL_METHODS,
  AUTH_FUNNEL_SCREENS,
  isAuthFunnelScreen,
  type AuthFunnelClientEventPayload,
  type AuthFunnelEvent,
  type AuthFunnelMethod,
  type AuthFunnelScreen,
  type AuthFunnelServerEventPayload,
} from "~/lib/observability/auth-funnel";
import type { ActionRequestContext } from "~/lib/observability/context";
import { observabilityService } from "~/server/shared/context";

export const AUTH_ANALYTICS_SCREENS = AUTH_FUNNEL_SCREENS;

export type AuthAnalyticsScreen = AuthFunnelScreen;

export const AUTH_ANALYTICS_METHODS = AUTH_FUNNEL_METHODS;

export type AuthAnalyticsMethod = AuthFunnelMethod;

export type AuthClientAnalyticsEvent = AuthFunnelClientEventPayload;

export type AuthServerAnalyticsEvent = AuthFunnelServerEventPayload;

export type AuthAnalyticsEvent = AuthFunnelEvent;

export function isAuthAnalyticsScreen(
  value: unknown,
): value is AuthAnalyticsScreen {
  return isAuthFunnelScreen(value);
}

export function recordAuthAnalyticsEvent(
  event: AuthAnalyticsEvent,
  requestContext: ActionRequestContext,
): Promise<void> {
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
    createdAt: Date.now(),
  });
}

function resolveEventScreen(
  event: AuthAnalyticsEvent,
): AuthAnalyticsScreen | null {
  if (event.kind === "screen_viewed") {
    return event.screen;
  }
  return null;
}

function resolveEventMethod(
  event: AuthAnalyticsEvent,
): AuthAnalyticsMethod | null {
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

function resolveEventOutcome(
  event: AuthAnalyticsEvent,
):
  | "viewed"
  | "failed"
  | "succeeded"
  | "started"
  | "totp_required"
  | "passkey_required" {
  if (event.kind === "screen_viewed") {
    return "viewed";
  }
  return event.outcome;
}

function resolveEventCode(event: AuthAnalyticsEvent): string | null {
  if ("code" in event) {
    return event.code;
  }
  return null;
}
