import type {
  AuthFunnelEventName,
  AuthFunnelMethod,
  AuthFunnelOutcome,
  AuthFunnelScreen,
  AuthFunnelSource,
} from "~/lib/observability/auth-funnel";

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
