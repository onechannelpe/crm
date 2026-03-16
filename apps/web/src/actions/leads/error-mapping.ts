import { internalError } from "~/lib/app-errors";
import type { LeadAssignmentError } from "~/server/lead-operations/assignment-service";

const leadErrorThrowers: Record<
  LeadAssignmentError["reason"],
  (message: string) => never
> = {
  unexpected: (message) => {
    throw internalError(message);
  },
};

export function throwLeadError(error: LeadAssignmentError): never {
  return leadErrorThrowers[error.reason](error.message);
}
