import {
  conflictError,
  forbiddenError,
  internalError,
  notFoundError,
  validationError,
} from "~/lib/app-errors";
import type {
  CapacityApprovalError,
  CapacityManageError,
  CapacityReadError,
  CapacityRequestError,
} from "~/server/capacity/errors";

export type CapacityActionError =
  | { reason: "forbidden"; message: string }
  | { reason: "not_found"; message: string }
  | { reason: "conflict"; message: string }
  | { reason: "validation"; message: string }
  | { reason: "unexpected"; message: string };

export function fromCapacityReadError(
  error: CapacityReadError,
): CapacityActionError {
  switch (error.reason) {
    case "forbidden":
      return { reason: "forbidden", message: error.message };
    case "not_found":
      return { reason: "not_found", message: error.message };
    case "unexpected":
      return { reason: "unexpected", message: error.message };
  }

  const unreachable: never = error;
  void unreachable;
  return { reason: "unexpected", message: "Unhandled capacity read error" };
}

export function fromCapacityRequestError(
  error: CapacityRequestError,
): CapacityActionError {
  switch (error.reason) {
    case "validation":
      return { reason: "validation", message: error.message };
    case "unexpected":
      return { reason: "unexpected", message: error.message };
  }

  const unreachable: never = error;
  void unreachable;
  return { reason: "unexpected", message: "Unhandled capacity request error" };
}

export function fromCapacityManageError(
  error: CapacityManageError,
): CapacityActionError {
  switch (error.reason) {
    case "forbidden":
      return { reason: "forbidden", message: error.message };
    case "not_found":
      return { reason: "not_found", message: error.message };
    case "conflict":
      return { reason: "conflict", message: error.message };
    case "validation":
      return { reason: "validation", message: error.message };
    case "unexpected":
      return { reason: "unexpected", message: error.message };
  }

  const unreachable: never = error;
  void unreachable;
  return { reason: "unexpected", message: "Unhandled capacity manage error" };
}

export function fromCapacityApprovalError(
  error: CapacityApprovalError,
): CapacityActionError {
  switch (error.reason) {
    case "forbidden":
      return { reason: "forbidden", message: error.message };
    case "not_found":
      return { reason: "not_found", message: error.message };
    case "conflict":
      return { reason: "conflict", message: error.message };
    case "validation":
      return { reason: "validation", message: error.message };
    case "unexpected":
      return { reason: "unexpected", message: error.message };
  }

  const unreachable: never = error;
  void unreachable;
  return { reason: "unexpected", message: "Unhandled capacity approval error" };
}

export function throwCapacityActionError(error: CapacityActionError): never {
  switch (error.reason) {
    case "not_found":
      throw notFoundError(error.message);
    case "forbidden":
      throw forbiddenError(error.message);
    case "conflict":
      throw conflictError(error.message);
    case "validation":
      throw validationError(error.message);
    case "unexpected":
      throw internalError(error.message);
  }

  const unreachable: never = error;
  throw internalError(unreachable);
}
