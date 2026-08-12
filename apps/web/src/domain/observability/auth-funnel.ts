import { isPlainRecord } from "~/shared/type-guards";

const AUTH_FUNNEL_SOURCES = ["client", "server"] as const;

export type AuthFunnelSource = (typeof AUTH_FUNNEL_SOURCES)[number];

const AUTH_FUNNEL_EVENT_NAMES = [
  "screen_viewed",
  "password_result",
  "passkey_start_result",
  "totp_result",
  "passkey_result",
] as const;

export type AuthFunnelEventName = (typeof AUTH_FUNNEL_EVENT_NAMES)[number];

const AUTH_FUNNEL_SCREENS = [
  "login",
  "login_verify",
  "login_passkey",
  "reset_password",
] as const;

export type AuthFunnelScreen = (typeof AUTH_FUNNEL_SCREENS)[number];

const AUTH_FUNNEL_METHODS = [
  "password",
  "password_totp",
  "passkey",
  "google",
] as const;

export type AuthFunnelMethod = (typeof AUTH_FUNNEL_METHODS)[number];

const AUTH_FUNNEL_OUTCOMES = [
  "viewed",
  "failed",
  "succeeded",
  "started",
  "totp_required",
  "passkey_required",
] as const;

export type AuthFunnelOutcome = (typeof AUTH_FUNNEL_OUTCOMES)[number];

export type AuthFunnelClientEventPayload =
  | {
      kind: "screen_viewed";
      screen: AuthFunnelScreen;
    }
  | {
      kind: "passkey_result";
      outcome: "failed";
      code: "cancelled" | "unsupported" | "server_error";
    };

export type AuthFunnelServerEventPayload =
  | {
      kind: "password_result";
      outcome: "failed";
      code: "invalid_credentials" | "strong_auth_required" | "internal";
    }
  | {
      kind: "password_result";
      outcome: "totp_required" | "passkey_required" | "succeeded";
    }
  | {
      kind: "passkey_start_result";
      outcome: "failed";
      code: "invalid_credentials" | "internal";
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
        | "internal"
        | "cancelled"
        | "unsupported"
        | "server_error";
    }
  | {
      kind: "passkey_result";
      outcome: "succeeded";
    };

export type AuthFunnelClientEvent = {
  source: "client";
} & AuthFunnelClientEventPayload;

export type AuthFunnelServerEvent = {
  source: "server";
} & AuthFunnelServerEventPayload;

export type AuthFunnelEvent = AuthFunnelClientEvent | AuthFunnelServerEvent;

function isAuthFunnelScreen(value: unknown): value is AuthFunnelScreen {
  return (
    typeof value === "string" &&
    AUTH_FUNNEL_SCREENS.some((screen) => screen === value)
  );
}

export function readAuthFunnelClientEvent(
  input: unknown,
): AuthFunnelClientEventPayload | null {
  if (!isPlainRecord(input)) {
    return null;
  }

  if (input.kind === "screen_viewed" && isAuthFunnelScreen(input.screen)) {
    return { kind: "screen_viewed", screen: input.screen };
  }

  if (
    input.kind === "passkey_result" &&
    input.outcome === "failed" &&
    (input.code === "cancelled" ||
      input.code === "unsupported" ||
      input.code === "server_error")
  ) {
    return {
      kind: "passkey_result",
      outcome: "failed",
      code: input.code,
    };
  }

  return null;
}

export function isAuthFunnelEventName(
  value: unknown,
): value is AuthFunnelEventName {
  return (
    typeof value === "string" &&
    AUTH_FUNNEL_EVENT_NAMES.some((eventName) => eventName === value)
  );
}

export function isAuthFunnelMethod(value: unknown): value is AuthFunnelMethod {
  return (
    typeof value === "string" &&
    AUTH_FUNNEL_METHODS.some((method) => method === value)
  );
}

export function isAuthFunnelOutcome(
  value: unknown,
): value is AuthFunnelOutcome {
  return (
    typeof value === "string" &&
    AUTH_FUNNEL_OUTCOMES.some((outcome) => outcome === value)
  );
}
