import type { LeadBlockingField } from "../../domain/lead-progress";
import { resolveLeadProgress } from "../../domain/lead-progress";
import type { LeadRecord } from "../../domain/lead-record";

export function presentLeadNextStep(input: {
  lead: Pick<LeadRecord, "stage">;
  sale: any | undefined;
}): string {
  return resolveLeadProgress({
    lead: input.lead,
  }).nextStep;
}

export function presentLeadBlockingFields(input: {
  lead: Pick<LeadRecord, "stage">;
  venueCount?: number;
}): LeadBlockingField[] {
  return resolveLeadProgress({
    lead: input.lead,
    venueCount: input.venueCount,
  }).blockingFields;
}
