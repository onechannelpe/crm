import type { ActionObservationsTable } from "~/lib/db/schema/modules/observability.types";

export type ObservationStatus = ActionObservationsTable["status"];

export interface ObservabilitySnapshotInput {
  windowMinutes?: number;
  limit?: number;
  status?: string;
  actionName?: string;
}

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
