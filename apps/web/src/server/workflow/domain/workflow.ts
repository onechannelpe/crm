import {
  type LeadPriority,
  type LeadStatus,
} from "~/contracts/workflow/vocabulary";

export function resolveReviewTransition(input: {
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
