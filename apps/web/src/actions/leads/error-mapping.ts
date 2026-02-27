import { internalError, rateLimitError } from "~/lib/app-errors";
import type { LeadAssignmentError } from "~/server/leads/service";

export function throwLeadError(error: LeadAssignmentError): never {
  switch (error.reason) {
    case "engine_unavailable":
    case "unexpected":
      throw internalError(error.message);
    case "quota_error":
      switch (error.quotaError.reason) {
        case "quota_exhausted":
          throw rateLimitError(error.quotaError.message);
        case "quota_not_allocated":
        case "invalid_refund_amount":
        case "unexpected":
          throw internalError(error.quotaError.message);
        default: {
          const exhausted: never = error.quotaError;
          throw internalError(`Unhandled quota error: ${String(exhausted)}`);
        }
      }
    default: {
      const exhausted: never = error;
      throw internalError(`Unhandled lead error: ${String(exhausted)}`);
    }
  }
}
