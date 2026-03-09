import type { ActionRequestContext } from "~/lib/observability/context";
import { createLogger } from "~/lib/observability/logger.server";

export const AUTH_ANALYTICS_SCREENS = [
  "login",
  "login_verify",
  "login_passkey_start",
  "login_passkey",
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
      code: "cancelled" | "unsupported";
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
        | "unsupported";
    }
  | {
      kind: "passkey_result";
      outcome: "succeeded";
    };

export type AuthAnalyticsEvent =
  | ({ source: "client" } & AuthClientAnalyticsEvent)
  | ({ source: "server" } & AuthServerAnalyticsEvent);

function authAnalyticsLogger() {
  return createLogger("auth.analytics");
}

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
): void {
  authAnalyticsLogger().info("auth_funnel_event", {
    authEvent: event.kind,
    authSource: event.source,
    routePath: requestContext.routePath,
    httpMethod: requestContext.httpMethod,
    traceId: requestContext.traceId,
    requestId: requestContext.requestId,
    latencyMs: Date.now() - requestContext.requestStartedAt,
    ...event,
  });
}
