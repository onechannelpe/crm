import { type LeadStatus } from "~/contracts/workflow/vocabulary";

// CARTERIZADO and STOCK mean the client is unavailable (already in another
// portfolio or parked); everything else clears the lead for pricing. This is
// also the rule that decides whether an answered inquiry is worth registering.
export function resolveReviewTransition(
  status: LeadStatus,
): "DISQUALIFIED" | "PRICING" {
  if (status === "CARTERIZADO" || status === "STOCK") {
    return "DISQUALIFIED";
  }
  return "PRICING";
}
