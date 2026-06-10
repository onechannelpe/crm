"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { isAuthAnalyticsScreen } from "~/lib/auth/auth-analytics";
import {
  isAuthFunnelEventName,
  isAuthFunnelMethod,
  isAuthFunnelOutcome,
  type AuthFunnelEventName,
  type AuthFunnelMethod,
  type AuthFunnelOutcome,
  type AuthFunnelScreen,
  type AuthFunnelSource,
} from "~/lib/observability/auth-funnel";
import { getServerRuntime } from "~/server/runtime";
import { invalid, throwDomain } from "~/server/shared/domain-error";

export interface AuthFunnelSummaryRow {
  eventName: AuthFunnelEventName;
  screen: AuthFunnelScreen | null;
  method: AuthFunnelMethod | null;
  outcome: AuthFunnelOutcome;
  source: AuthFunnelSource;
  count: number;
}

export interface AuthFunnelRecentEvent {
  id: number;
  createdAt: number;
  eventName: AuthFunnelEventName;
  screen: AuthFunnelScreen | null;
  method: AuthFunnelMethod | null;
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

function assertPositiveIntegerAtMost(
  value: number,
  field: string,
  code: string,
  max: number,
) {
  if (!Number.isInteger(value) || value < 1) {
    throwDomain(
      invalid({
        code,
        details: { field, rule: "positive_integer" },
      }),
    );
  }

  if (value > max) {
    throwDomain(
      invalid({
        code,
        details: {
          field,
          rule: "max",
          max,
          actual: value,
        },
      }),
    );
  }
}

function assertEventName(
  value: string | undefined,
): AuthFunnelEventName | undefined {
  if (!value) return undefined;

  if (isAuthFunnelEventName(value)) {
    return value;
  }

  throwDomain(invalid({ code: "invalid_event_name" }));
}

function assertMethod(
  value: string | undefined,
): Exclude<AuthFunnelMethod, null> | undefined {
  if (!value) return undefined;

  if (isAuthFunnelMethod(value)) {
    return value;
  }

  throwDomain(invalid({ code: "invalid_method" }));
}

function assertOutcome(
  value: string | undefined,
): AuthFunnelOutcome | undefined {
  if (!value) return undefined;

  if (isAuthFunnelOutcome(value)) {
    return value;
  }

  throwDomain(invalid({ code: "invalid_outcome" }));
}

function assertScreen(value: string | null): AuthFunnelScreen | null {
  if (value === null) return null;

  if (!isAuthAnalyticsScreen(value)) {
    throwDomain(invalid({ code: "invalid_screen" }));
  }

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

  const windowMinutes = params?.windowMinutes ?? 60;
  const limit = params?.limit ?? 50;

  assertPositiveIntegerAtMost(
    windowMinutes,
    "window_minutes",
    "invalid_window_minutes",
    24 * 60,
  );
  assertPositiveIntegerAtMost(limit, "limit", "invalid_limit", 200);

  const now = Date.now();
  const fromInclusive = now - windowMinutes * 60_000;

  const eventName = assertEventName(params?.eventName);
  const method = assertMethod(params?.method);
  const outcome = assertOutcome(params?.outcome);

  const { observabilityService } = getServerRuntime().observability;

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
      count: row.count ?? 0,
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
