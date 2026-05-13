import type {
  LeadPriority,
  LeadStatus,
} from "~/contracts/workflow";

import type { QualifyingLeadSubject } from "./lead-subjects";

export function resolveReviewTransition(input: {
  lead: QualifyingLeadSubject;
  status: LeadStatus;
  prioridad: LeadPriority;
}): "DISQUALIFIED" | "SCOPING" | "QUOTING" {
  if (input.status === "CARTERIZADO" || input.status === "STOCK") {
    return "DISQUALIFIED";
  }

  if (input.prioridad === "SIN RESULTADO") {
    return "SCOPING";
  }

  return "QUOTING";
}
