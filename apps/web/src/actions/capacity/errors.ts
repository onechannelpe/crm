import {
  conflictError,
  forbiddenError,
  internalError,
  notFoundError,
  validationError,
} from "~/lib/app-errors";

export type CapacityActionError =
  | { reason: "forbidden"; message: string }
  | { reason: "not_found"; message: string }
  | { reason: "conflict"; message: string }
  | { reason: "validation"; message: string }
  | { reason: "unexpected"; message: string };

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
