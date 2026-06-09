import {
  ActionError,
  GENERIC_ERROR,
  type WireError,
  type WireKind,
} from "~/lib/wire-error";

/**
 * The internal failure currency of the domain, service, and runtime layers.
 * Rich: it carries dev-facing detail (`message`, `details`, `cause`) that must
 * never reach the client. The boundary projects it to a `WireError` once, via
 * `toWire`. Service and command code returns `Result<T, DomainError>`.
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
  /** Stable, language-neutral granular code the client localizes on. */
  code: string;
  /** Dev-facing message. Internal only. */
  message: string;
  /** Structured internal context for logs/Sentry. Internal only. */
  details?: unknown;
  /** Underlying thrown cause, for reporting. Internal only. */
  cause?: unknown;
  /** Seconds until retry. Only meaningful for kind === "rate_limit". */
  retryAfterSeconds?: number;
}

export function domainError(
  kind: DomainErrorKind,
  code: string,
  message: string,
  details?: unknown,
): DomainError {
  return { kind, code, message, details };
}

// Wraps a caught, unexpected throwable. Its message is generic by construction;
// the cause rides along for reporting only.
export function unexpectedFault(cause: unknown): DomainError {
  return { kind: "internal", code: "internal", message: GENERIC_ERROR, cause };
}

// The coarse wire class for each internal kind. Every kind maps to the wire
// name it shares; only `external` collapses to "internal" so a third-party
// failure is indistinguishable from a server fault on the wire (both still keep
// their granular code for log correlation).
const DOMAIN_TO_WIRE: Record<DomainErrorKind, WireKind> = {
  validation: "validation",
  unauthenticated: "unauthenticated",
  forbidden: "forbidden",
  not_found: "not_found",
  conflict: "conflict",
  rate_limit: "rate_limit",
  external: "internal",
  internal: "internal",
};

// Only third-party (`external`) faults hide their message; their dev detail
// could leak provider internals. An explicit `internal` failure keeps the
// message the author chose (an unexpected throw is already generic via
// `unexpectedFault`).
function hidesMessage(kind: DomainErrorKind): boolean {
  return kind === "external";
}

/**
 * The single internal-to-wire projection. Drops `details`/`cause`/stack by
 * construction (the target type has no such fields) and hides the message for
 * server/third-party faults. There is no separate sanitize step.
 */
export function toWire(error: DomainError): WireError {
  const wire: WireError = {
    kind: DOMAIN_TO_WIRE[error.kind],
    code: error.code,
    message: hidesMessage(error.kind) ? GENERIC_ERROR : error.message,
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

// Drop-in `ActionError` factories for imperative throw sites (`throw
// validationFault("...")`). The granular `code` defaults to the kind; pass a
// specific code when the client should localize on it.
export function validationFault(
  message: string,
  code = "validation",
): ActionError {
  return actionErrorFrom(domainError("validation", code, message));
}

export function forbiddenFault(
  message: string,
  code = "forbidden",
): ActionError {
  return actionErrorFrom(domainError("forbidden", code, message));
}

export function notFoundFault(
  message: string,
  code = "not_found",
): ActionError {
  return actionErrorFrom(domainError("not_found", code, message));
}

export function conflictFault(message: string, code = "conflict"): ActionError {
  return actionErrorFrom(domainError("conflict", code, message));
}

export function internalFault(message: string, code = "internal"): ActionError {
  return actionErrorFrom(domainError("internal", code, message));
}

export function rateLimitFault(
  message: string,
  retryAfterSeconds: number,
  code = "rate_limit",
): ActionError {
  return actionErrorFrom({
    kind: "rate_limit",
    code,
    message,
    retryAfterSeconds,
  });
}
