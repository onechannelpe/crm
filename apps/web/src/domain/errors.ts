import { ERROR_CATALOG, type DomainCode } from "~/domain/error-catalog";

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
