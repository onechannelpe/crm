import { conflictError, internalError, notFoundError } from "~/lib/app-errors";

type LeadActionError =
  | { reason: "not_found"; message: string }
  | { reason: "conflict"; message: string }
  | { reason: "unexpected"; message: string };

export function throwLeadActionError(error: LeadActionError): never {
  if (error.reason === "not_found") throw notFoundError(error.message);
  if (error.reason === "conflict") throw conflictError(error.message);
  throw internalError(error.message);
}
