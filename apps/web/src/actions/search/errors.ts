import { conflictError, internalError, notFoundError } from "~/lib/app-errors";
import type { DirectSearchError } from "~/server/engine-gateway/errors";
import type {
  SearchAllowanceError,
  SearchRollbackError,
  SearchAllowanceSnapshotError,
} from "~/server/search-access/allowance-service";

type SearchActionError =
  | { reason: "not_found"; message: string }
  | { reason: "conflict"; message: string }
  | { reason: "unexpected"; message: string };

export function fromSearchAllowanceSnapshotError(
  error: SearchAllowanceSnapshotError,
): SearchActionError {
  switch (error.reason) {
    case "user_not_found":
      return { reason: "not_found", message: error.message };
    case "unexpected":
      return { reason: "unexpected", message: error.message };
  }

  const unreachable: never = error;
  void unreachable;
  return { reason: "unexpected", message: "Unhandled search snapshot error" };
}

export function fromSearchAllowanceError(
  error: SearchAllowanceError,
): SearchActionError {
  switch (error.reason) {
    case "search_exhausted":
      return { reason: "conflict", message: error.message };
    case "user_not_found":
      return { reason: "not_found", message: error.message };
    case "unexpected":
      return { reason: "unexpected", message: error.message };
  }

  const unreachable: never = error;
  void unreachable;
  return { reason: "unexpected", message: "Unhandled search allowance error" };
}

export function fromDirectSearchError(
  error: DirectSearchError,
): SearchActionError {
  switch (error.reason) {
    case "engine_request_failed":
      return { reason: "unexpected", message: error.message };
    case "unexpected":
      return { reason: "unexpected", message: error.message };
  }

  const unreachable: never = error;
  void unreachable;
  return { reason: "unexpected", message: "Unhandled direct search error" };
}

export function fromSearchRollbackError(
  error: SearchRollbackError,
): SearchActionError {
  switch (error.reason) {
    case "ledger_not_found":
      return { reason: "conflict", message: error.message };
    case "insufficient_usage":
      return { reason: "conflict", message: error.message };
    case "unexpected":
      return { reason: "unexpected", message: error.message };
  }

  const unreachable: never = error;
  void unreachable;
  return { reason: "unexpected", message: "Unhandled rollback error" };
}

export function throwSearchActionError(error: SearchActionError): never {
  switch (error.reason) {
    case "not_found":
      throw notFoundError(error.message);
    case "conflict":
      throw conflictError(error.message);
    case "unexpected":
      throw internalError(error.message);
  }

  const unreachable: never = error;
  throw internalError(String(unreachable));
}
