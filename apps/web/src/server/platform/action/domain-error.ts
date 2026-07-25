import { ActionError, type WireError } from "~/contracts/errors";
import { ERROR_CATALOG } from "~/domain/error-catalog";
import type { DomainError, DomainErrorKind } from "~/domain/errors";

const CLASS_MESSAGE_ES = {
  validation: "Revisa los datos ingresados.",
  unauthenticated: "Tu sesión expiró. Inicia sesión nuevamente.",
  forbidden: "No tienes permiso para realizar esta acción.",
  not_found: "No se encontró el recurso solicitado.",
  conflict: "No se pudo completar la operación.",
  rate_limit: "Demasiados intentos. Inténtalo de nuevo en unos momentos.",
  internal: "Ocurrió un error inesperado.",
} as const;

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

  if (error.kind === "external") return CLASS_MESSAGE_ES.internal;
  return CLASS_MESSAGE_ES[error.kind];
}

export function toWire(error: DomainError): WireError {
  const code = error.code;
  const message = messageFor(error);

  if (error.kind === "rate_limit") {
    return {
      kind: "rate_limit",
      code,
      message,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }

  return { kind: DOMAIN_TO_WIRE[error.kind], code, message };
}

export function throwDomain(error: DomainError): never {
  throw new ActionError(toWire(error));
}
