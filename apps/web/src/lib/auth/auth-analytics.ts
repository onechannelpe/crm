import type { ActionRequestContext } from "~/lib/observability/context";
import { observabilityService } from "~/server/shared/context";

export const AUTH_ANALYTICS_SCREENS = [
  "login",
  "login_verify",
  "login_passkey_start",
  "login_passkey",
  "reset_password",
] as const;

export type AuthAnalyticsScreen = (typeof AUTH_ANALYTICS_SCREENS)[number];

export const AUTH_ANALYTICS_METHODS = [
  "password",
  "password_totp",
  "passkey",
  "google",
] as const;

export type AuthAnalyticsMethod = (typeof AUTH_ANALYTICS_METHODS)[number];

export type AuthClientAnalyticsEvent =
  | {
      kind: "screen_viewed";
      screen: AuthAnalyticsScreen;
    }
  | {
      kind: "passkey_result";
      outcome: "failed";
      code: "cancelled" | "unsupported" | "browser_error";
    };

export type AuthServerAnalyticsEvent =
  | {
      kind: "password_result";
      outcome: "failed";
      code: "invalid_credentials" | "strong_auth_required";
    }
  | {
      kind: "password_result";
      outcome: "totp_required" | "passkey_required" | "succeeded";
    }
  | {
      kind: "passkey_start_result";
      outcome: "failed";
      code: "invalid_credentials";
    }
  | {
      kind: "passkey_start_result";
      outcome: "started";
    }
  | {
      kind: "totp_result";
      outcome: "failed";
      code: "invalid_totp" | "flow_expired";
    }
  | {
      kind: "totp_result";
      outcome: "succeeded";
    }
  | {
      kind: "passkey_result";
      outcome: "failed";
      code:
        | "invalid_credentials"
        | "flow_expired"
        | "cancelled"
        | "unsupported"
        | "browser_error";
    }
  | {
      kind: "passkey_result";
      outcome: "succeeded";
    };

export type AuthAnalyticsEvent =
  | ({ source: "client" } & AuthClientAnalyticsEvent)
  | ({ source: "server" } & AuthServerAnalyticsEvent);

export function isAuthAnalyticsScreen(
  value: unknown,
): value is AuthAnalyticsScreen {
  return (
    typeof value === "string" &&
    AUTH_ANALYTICS_SCREENS.some((screen) => screen === value)
  );
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
      if (
        event.screen === "login_passkey" ||
        event.screen === "login_passkey_start"
      ) {
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
