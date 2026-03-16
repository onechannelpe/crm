import {
  conflictError,
  internalError,
  notFoundError,
  validationError,
} from "~/lib/app-errors";
import type { DirectSearchError } from "~/server/engine-gateway/errors";
import type {
  SearchAllowanceError,
  SearchAllowanceSnapshotError,
} from "~/server/search-access/allowance-service";

export type SearchRollbackError = { reason: "unexpected"; message: string };

type SearchActionError =
  | { reason: "not_found"; message: string }
  | { reason: "conflict"; message: string }
  | { reason: "validation"; message: string }
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
    case "validation":
      return { reason: "validation", message: error.message };
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
    case "unexpected":
      return { reason: "unexpected", message: error.message };
  }

  const unreachable: never = error;
  void unreachable;
  return { reason: "unexpected", message: "Unhandled search rollback error" };
}

export function throwSearchActionError(error: SearchActionError): never {
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
