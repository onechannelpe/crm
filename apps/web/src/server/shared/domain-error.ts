export type DomainErrorKind =
  | "validation"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "external"
  | "unexpected";

export interface DomainError {
  kind: DomainErrorKind;
  code: string;
  message: string;
  details?: unknown;
}

export function domainError(
  kind: DomainErrorKind,
  code: string,
  message: string,
  details?: unknown,
): DomainError {
  return { kind, code, message, details };
}
