import { serializeEventPayload } from "~/contracts/events";
import type {
  AuthFunnelSnapshot,
  AuthFunnelSnapshotInput,
} from "~/contracts/observability/auth-funnel";
import type {
  ObservabilitySnapshot,
  ObservabilitySnapshotInput,
  ObservationStatus,
} from "~/contracts/observability/snapshot";
import type { Role } from "~/lib/auth/access/rbac";
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
import type { WireKind } from "~/lib/wire-error";
import { invalid, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import type { createActionObservationsRepo } from "./repos-action-observations";
import type { createAuthFunnelEventsRepo } from "./repos-auth-funnel-events";

const OBSERVABILITY_DEFAULT_WINDOW_MINUTES = 60;
const OBSERVABILITY_MAX_WINDOW_MINUTES = 24 * 60;
const OBSERVABILITY_DEFAULT_LIMIT = 50;
const OBSERVABILITY_MAX_LIMIT = 200;

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
  status: ObservationStatus;
  durationMs: number;
  errorCode: WireKind | null;
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
  const serialized = serializeEventPayload(input);
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

function mapCodeToDetails(code: WireKind): ErrorDetails {
  if (code === "unauthenticated") {
    return {
      code: "authentication_required",
      category: "authorization",
      publicError: "Authentication required",
      isSensitive: 0,
    };
  }
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
  status: ObservationStatus,
  errorCode: WireKind | null,
): ErrorDetails {
  if (status === "ok") {
    return {
      code: null,
      category: "none",
      publicError: null,
      isSensitive: 0,
    };
  }
  if (errorCode) {
    return mapCodeToDetails(errorCode);
  }
  return {
    code: "internal_error",
    category: "internal",
    publicError: "Unexpected error",
    isSensitive: 1,
  };
}

interface ActionSnapshotFilter {
  windowMinutes: number;
  limit: number;
  fromInclusive: number;
  toInclusive: number;
  actionName?: string;
  status?: ObservationStatus;
}

interface AuthFunnelSnapshotFilter {
  windowMinutes: number;
  limit: number;
  fromInclusive: number;
  toInclusive: number;
  eventName?: AuthFunnelEventName;
  method?: AuthFunnelMethod;
  outcome?: AuthFunnelOutcome;
}

function trimOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

function parsePositiveIntegerAtMost(
  value: number,
  options: {
    code: string;
    field: string;
    max: number;
  },
): Result<number, DomainError> {
  if (!Number.isInteger(value) || value < 1) {
    return Err(
      invalid({
        code: options.code,
        details: { field: options.field, rule: "positive_integer" },
      }),
    );
  }

  if (value > options.max) {
    return Err(
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

  return Ok(value);
}

function parseObservationStatus(
  value: string | undefined,
): Result<ObservationStatus | undefined, DomainError> {
  if (!value) return Ok(undefined);
  if (value === "ok" || value === "error") return Ok(value);

  return Err(invalid({ code: "invalid_status" }));
}

function parseAuthFunnelEventName(
  value: string | undefined,
): Result<AuthFunnelEventName | undefined, DomainError> {
  if (!value) return Ok(undefined);
  if (isAuthFunnelEventName(value)) return Ok(value);

  return Err(invalid({ code: "invalid_event_name" }));
}

function parseAuthFunnelMethod(
  value: string | undefined,
): Result<AuthFunnelMethod | undefined, DomainError> {
  if (!value) return Ok(undefined);
  if (isAuthFunnelMethod(value)) return Ok(value);

  return Err(invalid({ code: "invalid_method" }));
}

function parseAuthFunnelOutcome(
  value: string | undefined,
): Result<AuthFunnelOutcome | undefined, DomainError> {
  if (!value) return Ok(undefined);
  if (isAuthFunnelOutcome(value)) return Ok(value);

  return Err(invalid({ code: "invalid_outcome" }));
}

function parseActionSnapshotFilter(
  input: ObservabilitySnapshotInput | undefined,
): Result<ActionSnapshotFilter, DomainError> {
  const parsedWindowMinutes = parsePositiveIntegerAtMost(
    input?.windowMinutes ?? OBSERVABILITY_DEFAULT_WINDOW_MINUTES,
    {
      code: "invalid_window_minutes",
      field: "window_minutes",
      max: OBSERVABILITY_MAX_WINDOW_MINUTES,
    },
  );
  if (isErr(parsedWindowMinutes)) return parsedWindowMinutes;

  const parsedLimit = parsePositiveIntegerAtMost(
    input?.limit ?? OBSERVABILITY_DEFAULT_LIMIT,
    {
      code: "invalid_limit",
      field: "limit",
      max: OBSERVABILITY_MAX_LIMIT,
    },
  );
  if (isErr(parsedLimit)) return parsedLimit;

  const parsedStatus = parseObservationStatus(input?.status);
  if (isErr(parsedStatus)) return parsedStatus;

  const windowMinutes = parsedWindowMinutes.value;
  const now = Date.now();

  return Ok({
    windowMinutes,
    limit: parsedLimit.value,
    fromInclusive: now - windowMinutes * 60_000,
    toInclusive: now,
    actionName: trimOrUndefined(input?.actionName),
    status: parsedStatus.value,
  });
}

function parseAuthFunnelSnapshotFilter(
  input: AuthFunnelSnapshotInput | undefined,
): Result<AuthFunnelSnapshotFilter, DomainError> {
  const parsedWindowMinutes = parsePositiveIntegerAtMost(
    input?.windowMinutes ?? OBSERVABILITY_DEFAULT_WINDOW_MINUTES,
    {
      code: "invalid_window_minutes",
      field: "window_minutes",
      max: OBSERVABILITY_MAX_WINDOW_MINUTES,
    },
  );
  if (isErr(parsedWindowMinutes)) return parsedWindowMinutes;

  const parsedLimit = parsePositiveIntegerAtMost(
    input?.limit ?? OBSERVABILITY_DEFAULT_LIMIT,
    {
      code: "invalid_limit",
      field: "limit",
      max: OBSERVABILITY_MAX_LIMIT,
    },
  );
  if (isErr(parsedLimit)) return parsedLimit;

  const parsedEventName = parseAuthFunnelEventName(input?.eventName);
  if (isErr(parsedEventName)) return parsedEventName;

  const parsedMethod = parseAuthFunnelMethod(input?.method);
  if (isErr(parsedMethod)) return parsedMethod;

  const parsedOutcome = parseAuthFunnelOutcome(input?.outcome);
  if (isErr(parsedOutcome)) return parsedOutcome;

  const windowMinutes = parsedWindowMinutes.value;
  const now = Date.now();

  return Ok({
    windowMinutes,
    limit: parsedLimit.value,
    fromInclusive: now - windowMinutes * 60_000,
    toInclusive: now,
    eventName: parsedEventName.value,
    method: parsedMethod.value,
    outcome: parsedOutcome.value,
  });
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

    async getActionSnapshot(
      input?: ObservabilitySnapshotInput,
    ): Promise<Result<ObservabilitySnapshot, DomainError>> {
      const parsed = parseActionSnapshotFilter(input);
      if (isErr(parsed)) return parsed;

      const filter = parsed.value;
      const [summary, recent] = await Promise.all([
        repos.actionObservations.summarizeByAction({
          fromInclusive: filter.fromInclusive,
          toInclusive: filter.toInclusive,
          actionName: filter.actionName,
          status: filter.status,
        }),
        repos.actionObservations.findRecent({
          fromInclusive: filter.fromInclusive,
          toInclusive: filter.toInclusive,
          actionName: filter.actionName,
          status: filter.status,
          limit: filter.limit,
        }),
      ]);

      return Ok({
        windowMinutes: filter.windowMinutes,
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
      });
    },

    async getAuthFunnelSnapshot(
      input?: AuthFunnelSnapshotInput,
    ): Promise<Result<AuthFunnelSnapshot, DomainError>> {
      const parsed = parseAuthFunnelSnapshotFilter(input);
      if (isErr(parsed)) return parsed;

      const filter = parsed.value;
      const [summary, recent] = await Promise.all([
        repos.authFunnelEvents.summarize({
          fromInclusive: filter.fromInclusive,
          toInclusive: filter.toInclusive,
          eventName: filter.eventName,
          method: filter.method,
          outcome: filter.outcome,
        }),
        repos.authFunnelEvents.findRecent({
          fromInclusive: filter.fromInclusive,
          toInclusive: filter.toInclusive,
          eventName: filter.eventName,
          method: filter.method,
          outcome: filter.outcome,
          limit: filter.limit,
        }),
      ]);

      return Ok({
        windowMinutes: filter.windowMinutes,
        summary: summary.map((row) => ({
          eventName: row.event_name,
          screen: row.screen,
          method: row.method,
          outcome: row.outcome,
          source: row.source,
          count: row.count ?? 0,
        })),
        recent: recent.map((row) => ({
          id: row.id,
          createdAt: row.created_at,
          eventName: row.event_name,
          screen: row.screen,
          method: row.method,
          outcome: row.outcome,
          source: row.source,
          routePath: row.route_path,
          code: row.code,
        })),
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
      eventName?: AuthFunnelEventName;
      method?: AuthFunnelMethod;
      outcome?: AuthFunnelOutcome;
      limit: number;
    }) {
      return repos.authFunnelEvents.findRecent(params);
    },

    async summarizeAuthFunnel(params: {
      fromInclusive: number;
      toInclusive: number;
      eventName?: AuthFunnelEventName;
      method?: AuthFunnelMethod;
      outcome?: AuthFunnelOutcome;
    }) {
      return repos.authFunnelEvents.summarize(params);
    },
  };
}
