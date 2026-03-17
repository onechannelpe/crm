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

interface LegacyReasonError {
  reason: string;
  message: string;
  details?: unknown;
}

function kindFromReason(reason: string): DomainErrorKind {
  switch (reason) {
    case "validation":
      return "validation";
    case "forbidden":
      return "forbidden";
    case "not_found":
    case "user_not_found":
    case "ledger_not_found":
      return "not_found";
    case "conflict":
    case "search_exhausted":
    case "refill_exhausted":
    case "insufficient_usage":
      return "conflict";
    case "engine_request_failed":
    case "engine_unavailable":
      return "external";
    default:
      return "unexpected";
  }
}

function isDomainError(value: unknown): value is DomainError {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<DomainError>;
  return (
    typeof candidate.kind === "string" &&
    typeof candidate.code === "string" &&
    typeof candidate.message === "string"
  );
}

export function toDomainError(value: unknown): DomainError {
  if (isDomainError(value)) {
    return value;
  }

  const candidate = value as Partial<LegacyReasonError>;
  const reason =
    typeof candidate.reason === "string" ? candidate.reason : "unexpected";
  const message =
    typeof candidate.message === "string"
      ? candidate.message
      : "Unexpected failure";

  return {
    kind: kindFromReason(reason),
    code: reason,
    message,
    details: candidate.details,
  };
}

export function domainError(
  kind: DomainErrorKind,
  code: string,
  message: string,
  details?: unknown,
): DomainError {
  return { kind, code, message, details };
}
