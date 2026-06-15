import type { ActionObservationsTable } from "~/lib/db/schema/modules/observability.types";
import type {
  AuthFunnelEventName,
  AuthFunnelMethod,
  AuthFunnelOutcome,
  AuthFunnelScreen,
  AuthFunnelSource,
} from "~/lib/observability/auth-funnel";

export const OBSERVABILITY_DEFAULT_WINDOW_MINUTES = 60;
export const OBSERVABILITY_MAX_WINDOW_MINUTES = 24 * 60;
export const OBSERVABILITY_DEFAULT_LIMIT = 50;
export const OBSERVABILITY_MAX_LIMIT = 200;

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

export interface AuthFunnelSnapshotInput {
  windowMinutes?: number;
  limit?: number;
  eventName?: string;
  method?: string;
  outcome?: string;
}

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
