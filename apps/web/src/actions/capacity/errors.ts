import {
  conflictError,
  forbiddenError,
  internalError,
  notFoundError,
  validationError,
} from "~/lib/app-errors";

type CapacityActionError = {
  reason: "not_found" | "forbidden" | "conflict" | "validation" | "unexpected";
  message: string;
};

export function throwCapacityActionError(error: CapacityActionError): never {
  if (error.reason === "not_found") throw notFoundError(error.message);
  if (error.reason === "forbidden") throw forbiddenError(error.message);
  if (error.reason === "conflict") throw conflictError(error.message);
  if (error.reason === "validation") throw validationError(error.message);
  throw internalError(error.message);
}
