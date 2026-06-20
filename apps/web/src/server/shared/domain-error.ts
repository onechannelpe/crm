import { ActionError, type WireError } from "~/lib/wire-error";
import { ERROR_CATALOG, type DomainCode } from "~/server/shared/error-catalog";

const CLASS_MESSAGE_ES = {
  validation: "Revisa los datos ingresados.",
  unauthenticated: "Tu sesión expiró. Inicia sesión nuevamente.",
  forbidden: "No tienes permiso para realizar esta acción.",
  not_found: "No se encontró el recurso solicitado.",
  conflict: "No se pudo completar la operación.",
  rate_limit: "Demasiados intentos. Inténtalo de nuevo en unos momentos.",
  internal: "Ocurrió un error inesperado.",
} as const;

export type DomainErrorKind =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limit"
  | "external"
  | "internal";

type DomainErrorBase = {
  code: string | null;
  details?: unknown;
  cause?: unknown;
};

export type DomainError =
  | (DomainErrorBase & {
      kind: Exclude<DomainErrorKind, "external" | "internal" | "rate_limit">;
      catalogCode?: DomainCode;
    })
  | (DomainErrorBase & {
      kind: "rate_limit";
      retryAfterSeconds: number;
    })
  | (DomainErrorBase & {
      kind: "external" | "internal";
      internalMessage: string;
    });

export function fail(
  code: DomainCode,
  opts?: { details?: unknown; cause?: unknown },
): DomainError {
  const entry = ERROR_CATALOG[code];
  return {
    kind: entry.kind,
    code,
    catalogCode: code,
    details: opts?.details,
    cause: opts?.cause,
  };
}

export function invalid(opts?: {
  code?: string;
  details?: unknown;
  cause?: unknown;
}): DomainError {
  return {
    kind: "validation",
    code: opts?.code ?? null,
    details: opts?.details,
    cause: opts?.cause,
  };
}

export function unauthenticated(): DomainError {
  return { kind: "unauthenticated", code: null };
}

export function forbidden(opts?: { code?: string }): DomainError {
  return { kind: "forbidden", code: opts?.code ?? null };
}

export function rateLimited(
  retryAfterSeconds: number,
  opts?: { code?: string },
): DomainError {
  return {
    kind: "rate_limit",
    code: opts?.code ?? null,
    retryAfterSeconds,
  };
}

export function external(
  internalMessage: string,
  opts?: { code?: string; details?: unknown; cause?: unknown },
): DomainError {
  return {
    kind: "external",
    code: opts?.code ?? null,
    internalMessage,
    details: opts?.details,
    cause: opts?.cause,
  };
}

export function internal(
  internalMessage: string,
  opts?: { code?: string; details?: unknown; cause?: unknown },
): DomainError {
  return {
    kind: "internal",
    code: opts?.code ?? null,
    internalMessage,
    details: opts?.details,
    cause: opts?.cause,
  };
}

export function unexpectedFault(cause: unknown): DomainError {
  return internal(cause instanceof Error ? cause.message : String(cause), {
    cause,
  });
}

const DOMAIN_TO_WIRE = {
  validation: "validation",
  unauthenticated: "unauthenticated",
  forbidden: "forbidden",
  not_found: "not_found",
  conflict: "conflict",
  rate_limit: "rate_limit",
  external: "internal",
  internal: "internal",
} as const satisfies Record<DomainErrorKind, WireError["kind"]>;

function messageFor(error: DomainError): string {
  if ("catalogCode" in error && error.catalogCode) {
    return ERROR_CATALOG[error.catalogCode].message;
  }

  if (error.kind === "external") {
    return CLASS_MESSAGE_ES.internal;
  }

  return CLASS_MESSAGE_ES[error.kind];
}

export function toWire(error: DomainError): WireError {
  const wire: WireError = {
    kind: DOMAIN_TO_WIRE[error.kind],
    code: error.code,
    message: messageFor(error),
  };

  if (error.kind === "rate_limit") {
    wire.retryAfterSeconds = error.retryAfterSeconds;
  }

  return wire;
}

export function throwDomain(error: DomainError): never {
  throw new ActionError(toWire(error));
}
