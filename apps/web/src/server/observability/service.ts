import type { AppErrorCode } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { serializeAuditChanges } from "~/lib/contracts/audit";
import type {
  AuthFunnelEventName,
  AuthFunnelMethod,
  AuthFunnelOutcome,
  AuthFunnelScreen,
  AuthFunnelSource,
} from "~/lib/observability/auth-funnel";

import type { createActionObservationsRepo } from "./repos-action-observations";
import type { createAuthFunnelEventsRepo } from "./repos-auth-funnel-events";

interface ObservabilityRepos {
  actionObservations: ReturnType<typeof createActionObservationsRepo>;
  authFunnelEvents: ReturnType<typeof createAuthFunnelEventsRepo>;
}

export interface RecordActionObservationInput {
  traceId: string;
  requestId: string;
  routePath: string | null;
  httpMethod: string | null;
  actionName: string;
  actorUserId: number | null;
  actorRole: Role | null;
  status: "ok" | "error";
  durationMs: number;
  errorCode: AppErrorCode | null;
  errorMessage: string | null;
  input: unknown;
  createdAt: number;
}

export interface RecordAuthFunnelEventInput {
  traceId: string;
  requestId: string;
  routePath: string | null;
  source: AuthFunnelSource;
  eventName: AuthFunnelEventName;
  screen: AuthFunnelScreen | null;
  method: AuthFunnelMethod | null;
  outcome: AuthFunnelOutcome;
  code: string | null;
  createdAt: number;
}

function summarizeInput(input: unknown): string | null {
  const serialized = serializeAuditChanges(input);
  if (!serialized) return null;
  if (serialized.length <= 400) return serialized;
  return `${serialized.slice(0, 400)}…`;
}

type ErrorCategory =
  | "none"
  | "validation"
  | "authorization"
  | "conflict"
  | "not_found"
  | "rate_limit"
  | "internal";

interface ErrorDetails {
  code: string | null;
  category: ErrorCategory;
  publicError: string | null;
  isSensitive: number;
}

function mapCodeToDetails(code: AppErrorCode): ErrorDetails {
  if (code === "forbidden") {
    return {
      code: "authorization_denied",
      category: "authorization",
      publicError: "Authorization failed",
      isSensitive: 1,
    };
  }
  if (code === "not_found") {
    return {
      code: "resource_not_found",
      category: "not_found",
      publicError: "Requested resource was not found",
      isSensitive: 0,
    };
  }
  if (code === "rate_limit") {
    return {
      code: "rate_limited",
      category: "rate_limit",
      publicError: "Request was rate limited",
      isSensitive: 0,
    };
  }
  if (code === "conflict") {
    return {
      code: "state_conflict",
      category: "conflict",
      publicError: "Operation conflicts with current state",
      isSensitive: 0,
    };
  }
  if (code === "validation") {
    return {
      code: "validation_failed",
      category: "validation",
      publicError: "Validation failed",
      isSensitive: 0,
    };
  }
  return {
    code: "internal_error",
    category: "internal",
    publicError: "Unexpected error",
    isSensitive: 1,
  };
}

function resolveErrorDetails(
  status: "ok" | "error",
  appErrorCode: AppErrorCode | null,
): ErrorDetails {
  if (status === "ok") {
    return {
      code: null,
      category: "none",
      publicError: null,
      isSensitive: 0,
    };
  }
  if (appErrorCode) {
    return mapCodeToDetails(appErrorCode);
  }
  return {
    code: "internal_error",
    category: "internal",
    publicError: "Unexpected error",
    isSensitive: 1,
  };
}

export function createObservabilityService(repos: ObservabilityRepos) {
  return {
    async recordAction(input: RecordActionObservationInput): Promise<void> {
      const errorDetails = resolveErrorDetails(input.status, input.errorCode);
      await repos.actionObservations.create({
        trace_id: input.traceId,
        request_id: input.requestId,
        route_path: input.routePath,
        http_method: input.httpMethod,
        action_name: input.actionName,
        actor_user_id: input.actorUserId,
        actor_role: input.actorRole,
        status: input.status,
        duration_ms: Math.max(0, Math.round(input.durationMs)),
        error_code: errorDetails.code,
        error_category: errorDetails.category,
        public_error: errorDetails.publicError,
        is_sensitive: errorDetails.isSensitive,
        input_summary: summarizeInput(input.input),
        created_at: input.createdAt,
      });
    },

    async recordAuthFunnelEvent(
      input: RecordAuthFunnelEventInput,
    ): Promise<void> {
      await repos.authFunnelEvents.create({
        trace_id: input.traceId,
        request_id: input.requestId,
        route_path: input.routePath,
        source: input.source,
        event_name: input.eventName,
        screen: input.screen,
        method: input.method,
        outcome: input.outcome,
        code: input.code,
        created_at: input.createdAt,
      });
    },

    async listRecent(params: {
      fromInclusive: number;
      toInclusive: number;
      actionName?: string;
      status?: "ok" | "error";
      actorUserId?: number;
      limit: number;
    }) {
      return repos.actionObservations.findRecent(params);
    },

    async summarizeByAction(params: {
      fromInclusive: number;
      toInclusive: number;
      actionName?: string;
      status?: "ok" | "error";
      actorUserId?: number;
    }) {
      return repos.actionObservations.summarizeByAction(params);
    },

    async listRecentAuthFunnel(params: {
      fromInclusive: number;
      toInclusive: number;
      eventName?: RecordAuthFunnelEventInput["eventName"];
      method?: Exclude<RecordAuthFunnelEventInput["method"], null>;
      outcome?: RecordAuthFunnelEventInput["outcome"];
      limit: number;
    }) {
      return repos.authFunnelEvents.findRecent(params);
    },

    async summarizeAuthFunnel(params: {
      fromInclusive: number;
      toInclusive: number;
      eventName?: RecordAuthFunnelEventInput["eventName"];
      method?: Exclude<RecordAuthFunnelEventInput["method"], null>;
      outcome?: RecordAuthFunnelEventInput["outcome"];
    }) {
      return repos.authFunnelEvents.summarize(params);
    },
  };
}
