export type ObservationStatus = "ok" | "error";

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
  id: string;
  createdAt: number;
  actionName: string;
  status: ObservationStatus;
  durationMs: number;
  actorUserId: string | null;
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
