import { internalError } from "~/lib/app-errors";
import type { LeadAssignmentError } from "~/server/lead-ops/assignment-service";

export function throwLeadError(error: LeadAssignmentError): never {
  switch (error.reason) {
    case "engine_unavailable":
    case "unexpected":
      throw internalError(error.message);
    default: {
      const exhausted: never = error;
      throw internalError(`Unhandled lead error: ${String(exhausted)}`);
    }
  }
}
