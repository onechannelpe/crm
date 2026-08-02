import {
  type AuthFunnelEvent,
  type AuthFunnelScreen,
} from "~/domain/observability/auth-funnel";
import type { ActionRequestContext } from "~/server/platform/observability/context";
import type { OperationContext } from "~/server/platform/operation/context";

export interface AuthAnalyticsRecorder {
  recordAuthFunnelEvent(input: {
    traceId: string;
    requestId: string;
    routePath: string | null;
    source: AuthFunnelEvent["source"];
    eventName: AuthFunnelEvent["kind"];
    screen: AuthFunnelScreen | null;
    method: "password" | "passkey" | "password_totp" | null;
    outcome:
      | "viewed"
      | "failed"
      | "succeeded"
      | "started"
      | "totp_required"
      | "passkey_required";
    code: string | null;
    createdAt: Date;
  }): Promise<void>;
}

export function recordAuthAnalyticsEvent(
  event: AuthFunnelEvent,
  requestContext: ActionRequestContext,
  recorder: AuthAnalyticsRecorder,
  operation: OperationContext,
): Promise<void> {
  return recorder.recordAuthFunnelEvent({
    traceId: requestContext.traceId,
    requestId: requestContext.requestId,
    routePath: requestContext.routePath,
    source: event.source,
    eventName: event.kind,
    screen: resolveEventScreen(event),
    method: resolveEventMethod(event),
    outcome: resolveEventOutcome(event),
    code: resolveEventCode(event),
    createdAt: operation.operationAt,
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
