import type { WireKind } from "~/contracts/errors";
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
import type { Role } from "~/domain/auth/access/rbac";
import { invalid, type DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import {
  isAuthFunnelEventName,
  isAuthFunnelMethod,
  isAuthFunnelOutcome,
  type AuthFunnelEventName,
  type AuthFunnelMethod,
  type AuthFunnelOutcome,
  type AuthFunnelScreen,
  type AuthFunnelSource,
} from "~/domain/observability/auth-funnel";
import { addMilliseconds } from "~/domain/time/clock";
import {
  parsePositiveIntegerAtMost,
  trimOrUndefined,
} from "~/server/platform/action/query-window";
import { Err, isErr, Ok, type Result } from "~/shared/result";

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
  actorUserId: UserId | null;
  actorRole: Role | null;
  status: ObservationStatus;
  durationMs: number;
  errorCode: WireKind | null;
  errorMessage: string | null;
  input: unknown;
  createdAt: Date;
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
  createdAt: Date;
}

export async function recordActionObservation(
  actionObservations: ObservabilityRepos["actionObservations"],
  input: RecordActionObservationInput,
): Promise<void> {
  const errorDetails = resolveErrorDetails(input.status, input.errorCode);
  await actionObservations.create({
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
}

function summarizeInput(input: unknown): string | null {
  const serialized = serializeEventPayload(input);
  if (!serialized) return null;
  const text = JSON.stringify(serialized);
  if (text.length <= 400) return text;
  return `${text.slice(0, 400)}…`;
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
  isSensitive: boolean;
}

function mapCodeToDetails(code: WireKind): ErrorDetails {
  if (code === "unauthenticated") {
    return {
      code: "authentication_required",
      category: "authorization",
      publicError: "Authentication required",
      isSensitive: false,
    };
  }
  if (code === "forbidden") {
    return {
      code: "authorization_denied",
      category: "authorization",
      publicError: "Authorization failed",
      isSensitive: true,
    };
  }
  if (code === "not_found") {
    return {
      code: "resource_not_found",
      category: "not_found",
      publicError: "Requested resource was not found",
      isSensitive: false,
    };
  }
  if (code === "rate_limit") {
    return {
      code: "rate_limited",
      category: "rate_limit",
      publicError: "Request was rate limited",
      isSensitive: false,
    };
  }
  if (code === "conflict") {
    return {
      code: "state_conflict",
      category: "conflict",
      publicError: "Operation conflicts with current state",
      isSensitive: false,
    };
  }
  if (code === "validation") {
    return {
      code: "validation_failed",
      category: "validation",
      publicError: "Validation failed",
      isSensitive: false,
    };
  }
  return {
    code: "internal_error",
    category: "internal",
    publicError: "Unexpected error",
    isSensitive: true,
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
      isSensitive: false,
    };
  }
  if (errorCode) {
    return mapCodeToDetails(errorCode);
  }
  return {
    code: "internal_error",
    category: "internal",
    publicError: "Unexpected error",
    isSensitive: true,
  };
}

interface ActionSnapshotFilter {
  windowMinutes: number;
  limit: number;
  fromInclusive: Date;
  toInclusive: Date;
  actionName?: string;
  status?: ObservationStatus;
}

interface AuthFunnelSnapshotFilter {
  windowMinutes: number;
  limit: number;
  fromInclusive: Date;
  toInclusive: Date;
  eventName?: AuthFunnelEventName;
  method?: AuthFunnelMethod;
  outcome?: AuthFunnelOutcome;
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
  windowEndsAt: Date,
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

  return Ok({
    windowMinutes,
    limit: parsedLimit.value,
    fromInclusive: addMilliseconds(windowEndsAt, -windowMinutes * 60_000),
    toInclusive: windowEndsAt,
    actionName: trimOrUndefined(input?.actionName),
    status: parsedStatus.value,
  });
}

function parseAuthFunnelSnapshotFilter(
  input: AuthFunnelSnapshotInput | undefined,
  windowEndsAt: Date,
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

  return Ok({
    windowMinutes,
    limit: parsedLimit.value,
    fromInclusive: addMilliseconds(windowEndsAt, -windowMinutes * 60_000),
    toInclusive: windowEndsAt,
    eventName: parsedEventName.value,
    method: parsedMethod.value,
    outcome: parsedOutcome.value,
  });
}

export function createObservabilityService(repos: ObservabilityRepos) {
  return {
    recordAction(input: RecordActionObservationInput): Promise<void> {
      return recordActionObservation(repos.actionObservations, input);
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
      input: ObservabilitySnapshotInput | undefined,
      windowEndsAt: Date,
    ): Promise<Result<ObservabilitySnapshot, DomainError>> {
      const parsed = parseActionSnapshotFilter(input, windowEndsAt);
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
          createdAt: row.created_at.getTime(),
          actionName: row.action_name,
          status: row.status,
          durationMs: row.duration_ms,
          actorUserId: row.actor_user_id,
          actorRole: row.actor_role,
          routePath: row.route_path,
          errorCode: row.error_code,
          errorCategory: row.error_category,
          publicError: row.public_error,
          isSensitive: row.is_sensitive,
        })),
      });
    },

    async getAuthFunnelSnapshot(
      input: AuthFunnelSnapshotInput | undefined,
      windowEndsAt: Date,
    ): Promise<Result<AuthFunnelSnapshot, DomainError>> {
      const parsed = parseAuthFunnelSnapshotFilter(input, windowEndsAt);
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
          createdAt: row.created_at.getTime(),
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
  };
}
