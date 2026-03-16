import {
  conflictError,
  internalError,
  notFoundError,
  validationError,
} from "~/lib/app-errors";

type SearchActionError =
  | { reason: "not_found"; message: string }
  | { reason: "conflict"; message: string }
  | { reason: "validation"; message: string }
  | { reason: "unexpected"; message: string };

export function throwSearchActionError(error: SearchActionError): never {
  if (error.reason === "not_found") throw notFoundError(error.message);
  if (error.reason === "conflict") throw conflictError(error.message);
  if (error.reason === "validation") throw validationError(error.message);
  throw internalError(error.message);
}
