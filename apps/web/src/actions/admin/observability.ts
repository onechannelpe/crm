"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { observabilityService } from "~/server/shared/context";

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
  throw new Error("status is invalid");
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
    throw new Error(params.maxMessage);
  }
  return resolved;
}

function trimOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
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
      count: Number(row.count ?? 0),
      errorCount: Number(row.error_count ?? 0),
      avgDurationMs: Number(row.avg_duration_ms ?? 0),
      maxDurationMs: Number(row.max_duration_ms ?? 0),
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
