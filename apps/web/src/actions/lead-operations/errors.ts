import { conflictError, internalError, notFoundError } from "~/lib/app-errors";

type LeadActionError =
  | { reason: "not_found"; message: string }
  | { reason: "conflict"; message: string }
  | { reason: "unexpected"; message: string };

export function throwLeadActionError(error: LeadActionError): never {
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
