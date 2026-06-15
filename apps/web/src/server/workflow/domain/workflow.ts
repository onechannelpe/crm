import {
  type LeadPriority,
  type LeadStatus,
} from "~/contracts/workflow/vocabulary";

export function resolveReviewTransition(input: {
  status: LeadStatus;
  prioridad: LeadPriority;
}): "DISQUALIFIED" | "PRICING" {
  if (input.status === "CARTERIZADO" || input.status === "STOCK") {
    return "DISQUALIFIED";
  }
  return "PRICING";
}
