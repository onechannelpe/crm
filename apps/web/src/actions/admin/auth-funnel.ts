"use server";

import { validationError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import {
  isAuthAnalyticsScreen,
  type AuthAnalyticsMethod,
  type AuthAnalyticsScreen,
} from "~/lib/auth/auth-analytics";
import { assertPositiveInt } from "~/lib/contracts/guards";
import type { AuthFunnelEventsTable } from "~/lib/db/schema";
import { observabilityService } from "~/server/shared/context";

type AuthFunnelEventName = AuthFunnelEventsTable["event_name"];
type AuthFunnelOutcome = AuthFunnelEventsTable["outcome"];
type AuthFunnelSource = AuthFunnelEventsTable["source"];

export interface AuthFunnelSummaryRow {
  eventName: AuthFunnelEventName;
  screen: AuthAnalyticsScreen | null;
  method: AuthAnalyticsMethod | null;
  outcome: AuthFunnelOutcome;
  source: AuthFunnelSource;
  count: number;
}

export interface AuthFunnelRecentEvent {
  id: number;
  createdAt: number;
  eventName: AuthFunnelEventName;
  screen: AuthAnalyticsScreen | null;
  method: AuthAnalyticsMethod | null;
  outcome: AuthFunnelOutcome;
  source: AuthFunnelSource;
  routePath: string | null;
  code: string | null;
}

export interface AuthFunnelSnapshot {
  windowMinutes: number;
  summary: AuthFunnelSummaryRow[];
  recent: AuthFunnelRecentEvent[];
}

function resolveBoundedPositiveInt(params: {
  value: number | undefined;
  fallback: number;
  name: string;
  max: number;
  maxMessage: string;
}): number {
  const resolved = assertPositiveInt(
    params.value ?? params.fallback,
    params.name,
  );
  if (resolved > params.max) {
    throw validationError(params.maxMessage);
  }
  return resolved;
}

function assertEventName(
  value: string | undefined,
): AuthFunnelEventName | undefined {
  if (!value) return undefined;
  if (
    value === "screen_viewed" ||
    value === "password_result" ||
    value === "passkey_start_result" ||
    value === "totp_result" ||
    value === "passkey_result"
  ) {
    return value;
  }
  throw validationError("eventName is invalid");
}

function assertMethod(
  value: string | undefined,
): Exclude<AuthAnalyticsMethod, null> | undefined {
  if (!value) return undefined;
  if (
    value === "password" ||
    value === "password_totp" ||
    value === "passkey" ||
    value === "google"
  ) {
    return value;
  }
  throw validationError("method is invalid");
}

function assertOutcome(
  value: string | undefined,
): AuthFunnelOutcome | undefined {
  if (!value) return undefined;
  if (
    value === "viewed" ||
    value === "failed" ||
    value === "succeeded" ||
    value === "started" ||
    value === "totp_required" ||
    value === "passkey_required"
  ) {
    return value;
  }
  throw validationError("outcome is invalid");
}

function assertScreen(value: string | null): AuthAnalyticsScreen | null {
  if (value === null) return null;
  if (!isAuthAnalyticsScreen(value)) throw validationError("screen is invalid");
  return value;
}

export async function getAuthFunnelSnapshot(params?: {
  windowMinutes?: number;
  limit?: number;
  eventName?: string;
  method?: string;
  outcome?: string;
}): Promise<AuthFunnelSnapshot> {
  await requirePermission("audit:read");

  const windowMinutes = resolveBoundedPositiveInt({
    value: params?.windowMinutes,
    fallback: 60,
    name: "windowMinutes",
    max: 24 * 60,
    maxMessage: "windowMinutes must be <= 1440",
  });
  const limit = resolveBoundedPositiveInt({
    value: params?.limit,
    fallback: 50,
    name: "limit",
    max: 200,
    maxMessage: "limit must be <= 200",
  });

  const now = Date.now();
  const fromInclusive = now - windowMinutes * 60 * 1000;
  const eventName = assertEventName(params?.eventName);
  const method = assertMethod(params?.method);
  const outcome = assertOutcome(params?.outcome);

  const [summary, recent] = await Promise.all([
    observabilityService.summarizeAuthFunnel({
      fromInclusive,
      toInclusive: now,
      eventName,
      method,
      outcome,
    }),
    observabilityService.listRecentAuthFunnel({
      fromInclusive,
      toInclusive: now,
      eventName,
      method,
      outcome,
      limit,
    }),
  ]);

  return {
    windowMinutes,
    summary: summary.map((row) => ({
      eventName: row.event_name,
      screen: assertScreen(row.screen),
      method: row.method,
      outcome: row.outcome,
      source: row.source,
      count: Number(row.count ?? 0),
    })),
    recent: recent.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      eventName: row.event_name,
      screen: assertScreen(row.screen),
      method: row.method,
      outcome: row.outcome,
      source: row.source,
      routePath: row.route_path,
      code: row.code,
    })),
  };
}
