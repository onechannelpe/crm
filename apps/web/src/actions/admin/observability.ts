"use server";

import { validationError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import { serverRuntime } from "~/server/runtime";
import { asUserId, isUserId, type UserId } from "~/server/shared/ids";

import { resolveBoundedPositiveInt, trimOrUndefined } from "./analytics-input";

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
  actorUserId: UserId | null;
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
  throw validationError("status is invalid");
}

function parseActorUserId(value: string | null): UserId | null {
  if (value === null) {
    return null;
  }
  if (!isUserId(value)) {
    throw validationError("actorUserId is invalid");
  }
  return asUserId(value);
}

export async function getObservabilitySnapshot(params?: {
  windowMinutes?: number;
  limit?: number;
  status?: string;
  actionName?: string;
}): Promise<ObservabilitySnapshot> {
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
  const status = assertStatus(params?.status);
  const actionName = trimOrUndefined(params?.actionName);
  const { observabilityService } = serverRuntime.observability;

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
      actorUserId: parseActorUserId(row.actor_user_id),
      actorRole: row.actor_role,
      routePath: row.route_path,
      errorCode: row.error_code,
      errorCategory: row.error_category,
      publicError: row.public_error,
      isSensitive: row.is_sensitive === 1,
    })),
  };
}
