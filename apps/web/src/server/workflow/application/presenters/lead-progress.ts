import type { LeadBlockingField } from "../../domain/lead-progress";
import { resolveLeadProgress } from "../../domain/lead-progress";
import type { LeadRecord } from "../../domain/lead-record";

export function presentLeadNextStep(input: {
  lead: Pick<LeadRecord, "stage">;
}): string {
  return resolveLeadProgress({
    lead: input.lead,
  }).nextStep;
}

export function presentLeadBlockingFields(input: {
  lead: Pick<LeadRecord, "stage">;
  venuesWithAccountsCount?: number;
}): LeadBlockingField[] {
  return resolveLeadProgress({
    lead: input.lead,
    venuesWithAccountsCount: input.venuesWithAccountsCount,
  }).blockingFields;
}
