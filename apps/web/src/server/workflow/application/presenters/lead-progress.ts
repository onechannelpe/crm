import type { LeadBlockingField } from "../../domain/lead-progress";
import { resolveLeadProgress } from "../../domain/lead-progress";
import type { LeadRecord } from "../../domain/lead-record";

export function presentLeadNextStep(input: {
  lead: Pick<LeadRecord, "stage">;
  venueCount?: number;
}): string {
  return resolveLeadProgress({
    lead: input.lead,
    venueCount: input.venueCount,
  }).nextStep;
}

export function presentLeadBlockingFields(input: {
  lead: Pick<LeadRecord, "stage">;
  venueCount?: number;
  venuesWithAccountsCount?: number;
}): LeadBlockingField[] {
  return resolveLeadProgress({
    lead: input.lead,
    venueCount: input.venueCount,
    venuesWithAccountsCount: input.venuesWithAccountsCount,
  }).blockingFields;
}
