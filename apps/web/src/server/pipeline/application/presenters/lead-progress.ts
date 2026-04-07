import type { LeadBlockingField } from "../../domain/lead-progress";
import { resolveLeadProgress } from "../../domain/lead-progress";
import type { LeadRecord } from "../../domain/lead-record";
import type { LeadSale } from "../ports/sale-repository";

export function presentLeadNextStep(input: {
  lead: Pick<LeadRecord, "stage">;
  sale: Pick<LeadSale, "banco"> | undefined;
}): string {
  return resolveLeadProgress({
    lead: input.lead,
    bank: input.sale?.banco,
  }).nextStep;
}

export function presentLeadBlockingFields(input: {
  lead: Pick<LeadRecord, "stage">;
  sale: Pick<LeadSale, "banco"> | undefined;
}): LeadBlockingField[] {
  return resolveLeadProgress({
    lead: input.lead,
    bank: input.sale?.banco,
  }).blockingFields;
}
