"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { getServerRuntime } from "~/server/runtime";
import { invalid, throwDomain } from "~/server/shared/domain-error";

type ObservationStatus = "ok" | "error";

export interface ObservabilityActionSummary {
  actionName: string;
  count: number;
  errorCount: number;
  avgDurationMs: number;
  maxDurationMs: number;
}

export interface ObservabilityActionEvent {
  id: number;
  createdAt: number;
  actionName: string;
  status: ObservationStatus;
  durationMs: number;
  actorUserId: number | null;
  actorRole: string | null;
  routePath: string | null;
  errorCode: string | null;
  errorCategory: string;
  publicError: string | null;
  isSensitive: boolean;
}

export interface ObservabilitySnapshot {
  windowMinutes: number;
  summary: ObservabilityActionSummary[];
  recent: ObservabilityActionEvent[];
}

function assertStatus(
  value: string | undefined,
): ObservationStatus | undefined {
  if (!value) return undefined;
  if (value === "ok" || value === "error") return value;

  throwDomain(invalid({ code: "invalid_status" }));
}

function trimOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed || undefined;
}

function assertPositiveIntegerLimit(
  value: number,
  options: {
    code: string;
    field: string;
    max: number;
  },
): number {
  if (!Number.isInteger(value) || value < 1) {
    throwDomain(
      invalid({
        code: options.code,
        details: {
          field: options.field,
          rule: "positive_integer",
        },
      }),
    );
  }

  if (value > options.max) {
    throwDomain(
      invalid({
        code: options.code,
        details: {
          field: options.field,
          rule: "max",
          max: options.max,
          actual: value,
        },
      }),
    );
  }

  return value;
}

export async function getObservabilitySnapshot(params?: {
  windowMinutes?: number;
  limit?: number;
  status?: string;
  actionName?: string;
}): Promise<ObservabilitySnapshot> {
  await requirePermission("audit:read");

  const windowMinutes = assertPositiveIntegerLimit(
    params?.windowMinutes ?? 60,
    {
      code: "invalid_window_minutes",
      field: "window_minutes",
      max: 24 * 60,
    },
  );

  const limit = assertPositiveIntegerLimit(params?.limit ?? 50, {
    code: "invalid_limit",
    field: "limit",
    max: 200,
  });

  const status = assertStatus(params?.status);
  const actionName = trimOrUndefined(params?.actionName);

  const now = Date.now();
  const fromInclusive = now - windowMinutes * 60_000;

  const { observabilityService } = getServerRuntime().observability;

  const [summary, recent] = await Promise.all([
    observabilityService.summarizeByAction({
      fromInclusive,
      toInclusive: now,
      actionName,
      status,
    }),
    observabilityService.listRecent({
      fromInclusive,
      toInclusive: now,
      actionName,
      status,
      limit,
    }),
  ]);

  return {
    windowMinutes,
    summary: summary.map((row) => ({
      actionName: row.action_name,
      count: row.count ?? 0,
      errorCount: row.error_count ?? 0,
      avgDurationMs: row.avg_duration_ms ?? 0,
      maxDurationMs: row.max_duration_ms ?? 0,
    })),
    recent: recent.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      actionName: row.action_name,
      status: row.status,
      durationMs: row.duration_ms,
      actorUserId: row.actor_user_id,
      actorRole: row.actor_role,
      routePath: row.route_path,
      errorCode: row.error_code,
      errorCategory: row.error_category,
      publicError: row.public_error,
      isSensitive: row.is_sensitive === 1,
    })),
  };
}
