import {
  conflictError,
  forbiddenError,
  internalError,
  notFoundError,
  rateLimitError,
  validationError,
} from "~/lib/app-errors";
import type { DomainError } from "~/server/shared/domain-error";

export function throwDomainError(domainError: DomainError): never {
  switch (domainError.kind) {
    case "validation":
      throw validationError(domainError.message);
    case "forbidden":
      throw forbiddenError(domainError.message);
    case "not_found":
      throw notFoundError(domainError.message);
    case "conflict":
      throw conflictError(domainError.message);
    case "rate_limited":
      throw rateLimitError(domainError.message);
    case "external":
      throw internalError(domainError.message);
  }

  const unreachable: never = domainError.kind;
  throw internalError(String(unreachable));
}
