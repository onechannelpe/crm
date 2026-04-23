import type {
  LeadPriority,
  LeadStatus,
} from "~/workflow/contracts/lead-schema";

import type { PendingReviewLeadSubject } from "./lead-subjects";

export function resolveReviewTransition(input: {
  lead: PendingReviewLeadSubject;
  status: LeadStatus;
  prioridad: LeadPriority;
}): "REJECTED_BY_STATUS" | "NEEDS_EXECUTIVE_INPUT" | "READY_FOR_QUOTATION" {
  if (input.status === "CARTERIZADO" || input.status === "STOCK") {
    return "REJECTED_BY_STATUS";
  }

  if (input.prioridad === "SIN RESULTADO") {
    return "NEEDS_EXECUTIVE_INPUT";
  }

  return "READY_FOR_QUOTATION";
}
