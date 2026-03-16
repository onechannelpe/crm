import {
  conflictError,
  internalError,
  notFoundError,
  validationError,
} from "~/lib/app-errors";
import type {
  LeadCapacitySnapshotError,
  LeadRefillError,
} from "~/server/lead-operations/refill-service";

type LeadActionError =
  | { reason: "not_found"; message: string }
  | { reason: "conflict"; message: string }
  | { reason: "validation"; message: string }
  | { reason: "unexpected"; message: string };

export function fromLeadCapacitySnapshotError(
  error: LeadCapacitySnapshotError,
): LeadActionError {
  switch (error.reason) {
    case "user_not_found":
      return { reason: "not_found", message: error.message };
    case "unexpected":
      return { reason: "unexpected", message: error.message };
  }

  const unreachable: never = error;
  void unreachable;
  return { reason: "unexpected", message: "Unhandled lead snapshot error" };
}

export function fromLeadRefillError(error: LeadRefillError): LeadActionError {
  switch (error.reason) {
    case "refill_exhausted":
      return { reason: "conflict", message: error.message };
    case "user_not_found":
      return { reason: "not_found", message: error.message };
    case "engine_unavailable":
      return { reason: "unexpected", message: error.message };
    case "validation":
      return { reason: "validation", message: error.message };
    case "unexpected":
      return { reason: "unexpected", message: error.message };
  }

  const unreachable: never = error;
  void unreachable;
  return { reason: "unexpected", message: "Unhandled lead refill error" };
}

export function throwLeadActionError(error: LeadActionError): never {
  switch (error.reason) {
    case "not_found":
      throw notFoundError(error.message);
    case "conflict":
      throw conflictError(error.message);
    case "validation":
      throw validationError(error.message);
    case "unexpected":
      throw internalError(error.message);
  }

  const unreachable: never = error;
  throw internalError(String(unreachable));
}
