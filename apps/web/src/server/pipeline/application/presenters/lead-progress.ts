import type { Lead } from "../../domain/lead";
import type { LeadBlockingField } from "../../domain/lead-progress";
import { resolveLeadProgress } from "../../domain/lead-progress";
import type { LeadSale } from "../ports/sale-repository";

export function presentLeadNextStep(input: {
  lead: Pick<Lead, "stage">;
  sale: Pick<LeadSale, "banco"> | undefined;
}): string {
  return resolveLeadProgress({
    lead: input.lead,
    bank: input.sale?.banco,
  }).nextStep;
}

export function presentLeadBlockingFields(input: {
  lead: Pick<Lead, "stage">;
  sale: Pick<LeadSale, "banco"> | undefined;
}): LeadBlockingField[] {
  return resolveLeadProgress({
    lead: input.lead,
    bank: input.sale?.banco,
  }).blockingFields;
}
