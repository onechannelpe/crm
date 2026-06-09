import { ActionError, type WireError } from "~/lib/wire-error";
import { ERROR_CATALOG, type DomainCode } from "~/server/shared/error-catalog";

// User-facing copy for failures with no more specific message: server bugs and
// third-party faults. Server-owned, like all other copy.
const GENERIC_MESSAGE_ES = "Ocurrió un error inesperado.";

/**
 * The internal failure currency of the domain, service, and runtime layers.
 * Service and command code returns `Result<T, DomainError>`.
 *
 * It carries two messages that must not be confused:
 *  - `message` is render-ready Spanish for the user. It is the only message
 *    that crosses to the client (via `toWire`). It is decided at construction:
 *    cataloged copy for `fail`, a class default for the generic constructors,
 *    the generic line for server/third-party faults. The client renders it
 *    verbatim and owns no copy.
 *  - `logMessage` is dev-facing detail for Sentry/logs (a provider response, a
 *    thrown error's text). It never reaches the client.
 */
export type DomainErrorKind =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limit"
  | "external"
  | "internal";

export interface DomainError {
  kind: DomainErrorKind;
  /**
   * Granular code. A catalog code for `fail`, an auto-derived path for field
   * validation, a passthrough code for third-party faults, or null for a
   * class-level failure. Drives client behavior (branching), never display.
   */
  code: string | null;
  /** Render-ready Spanish shown to the user. Crosses to the wire. */
  message: string;
  /** Dev-facing detail for logs/Sentry. Internal only, never on the wire. */
  logMessage?: string;
  /** Structured internal context for logs/Sentry. Internal only. */
  details?: unknown;
  /** Underlying thrown cause, for reporting. Internal only. */
  cause?: unknown;
  /** Seconds until retry. Only meaningful for kind === "rate_limit". */
  retryAfterSeconds?: number;
}

// Generic per-class Spanish copy for failures that carry no specific code. The
// single source for class-level wording; specific wording lives in the catalog.
const CLASS_MESSAGE_ES: Record<DomainErrorKind, string> = {
  validation: "Revisa los datos ingresados.",
  unauthenticated: "Tu sesión expiró. Inicia sesión nuevamente.",
  forbidden: "No tienes permiso para realizar esta acción.",
  not_found: "No se encontró el recurso solicitado.",
  conflict: "No se pudo completar la operación.",
  rate_limit: "Demasiados intentos. Inténtalo de nuevo en unos momentos.",
  external: GENERIC_MESSAGE_ES,
  internal: GENERIC_MESSAGE_ES,
};

/**
 * A specific, user-facing failure. Looks up its `kind` and Spanish copy in the
 * catalog, so the call site states only the code. The compiler rejects any code
 * absent from the catalog.
 */
export function fail(
  code: DomainCode,
  opts?: { details?: unknown },
): DomainError {
  const entry = ERROR_CATALOG[code];
  return { kind: entry.kind, code, message: entry.message, ...opts };
}

/**
 * A generic validation failure with no specific catalog code. `code` is carried
 * for telemetry and client branching; the user sees the generic class message.
 * Used for the field-validation long tail and technical input checks.
 */
export function invalid(opts?: {
  code?: string;
  details?: unknown;
}): DomainError {
  return {
    kind: "validation",
    code: opts?.code ?? null,
    message: CLASS_MESSAGE_ES.validation,
    details: opts?.details,
  };
}

/** No valid session. */
export function unauthenticated(): DomainError {
  return {
    kind: "unauthenticated",
    code: null,
    message: CLASS_MESSAGE_ES.unauthenticated,
  };
}

/**
 * A session exists but lacks the required role/permission. `code` is carried for
 * telemetry and client branching; the user always sees the generic message.
 */
export function forbidden(opts?: { code?: string }): DomainError {
  return {
    kind: "forbidden",
    code: opts?.code ?? null,
    message: CLASS_MESSAGE_ES.forbidden,
  };
}

/**
 * A server-side bug or invariant violation. The user sees the generic message;
 * `logMessage`/`cause` carry the dev detail for Sentry.
 */
export function internal(
  logMessage: string,
  opts?: { code?: string; cause?: unknown; details?: unknown },
): DomainError {
  return {
    kind: "internal",
    code: opts?.code ?? null,
    message: CLASS_MESSAGE_ES.internal,
    logMessage,
    cause: opts?.cause,
    details: opts?.details,
  };
}

/**
 * A third-party dependency failed (payment provider, search engine). The user
 * sees the generic message; `logMessage`/`details` carry provider detail that
 * could leak internals and must stay off the wire.
 */
export function external(
  logMessage: string,
  opts?: { code?: string; cause?: unknown; details?: unknown },
): DomainError {
  return {
    kind: "external",
    code: opts?.code ?? null,
    message: CLASS_MESSAGE_ES.external,
    logMessage,
    cause: opts?.cause,
    details: opts?.details,
  };
}

/** Too many attempts. `retryAfterSeconds` rides through to the wire. */
export function rateLimited(
  retryAfterSeconds: number,
  opts?: { code?: string },
): DomainError {
  return {
    kind: "rate_limit",
    code: opts?.code ?? null,
    message: CLASS_MESSAGE_ES.rate_limit,
    retryAfterSeconds,
  };
}

/** Wraps a caught, unexpected throwable as an internal fault for reporting. */
export function unexpectedFault(cause: unknown): DomainError {
  return {
    kind: "internal",
    code: null,
    message: CLASS_MESSAGE_ES.internal,
    logMessage: cause instanceof Error ? cause.message : String(cause),
    cause,
  };
}

// The coarse wire class for each internal kind. Every kind maps to the wire
// name it shares; only `external` collapses to "internal" so a third-party
// failure is indistinguishable from a server fault on the wire.
const DOMAIN_TO_WIRE: Record<DomainErrorKind, WireError["kind"]> = {
  validation: "validation",
  unauthenticated: "unauthenticated",
  forbidden: "forbidden",
  not_found: "not_found",
  conflict: "conflict",
  rate_limit: "rate_limit",
  external: "internal",
  internal: "internal",
};

/**
 * The single internal-to-wire projection. A pure field copy: the user message
 * was decided at construction, and the internal-only fields (`logMessage`,
 * `details`, `cause`) have no slot in `WireError`, so there is nothing to
 * sanitize.
 */
export function toWire(error: DomainError): WireError {
  const wire: WireError = {
    kind: DOMAIN_TO_WIRE[error.kind],
    code: error.code,
    message: error.message,
  };
  if (error.retryAfterSeconds !== undefined) {
    wire.retryAfterSeconds = error.retryAfterSeconds;
  }
  return wire;
}

/** Wraps a domain failure as the thrown wire error for the public edge. */
export function actionErrorFrom(error: DomainError): ActionError {
  return new ActionError(toWire(error));
}

/**
 * Throws a domain failure as an `ActionError` at an imperative boundary (rate
 * limiting, ownership guards, auth facades). Prefer returning
 * `Result<T, DomainError>` from service code; use this only where the call site
 * is a guard that must short-circuit.
 */
export function throwDomain(error: DomainError): never {
  throw actionErrorFrom(error);
}
