import type { LeadBlockingField } from "../../domain/lead-progress";
import { resolveLeadProgress } from "../../domain/lead-progress";
import type { LeadRecord } from "../../domain/lead-record";
import type { LeadProfile } from "../ports/lead-profile-repository";
import type { OrganizationProfile } from "../ports/party-repository";

export function presentLeadNextStep(input: {
  lead: Pick<LeadRecord, "stage">;
}): string {
  return resolveLeadProgress({
    lead: input.lead,
  }).nextStep;
}

export function presentLeadBlockingFields(input: {
  lead: Pick<LeadRecord, "stage">;
  profile?: LeadProfile | null;
  organization?: OrganizationProfile | null;
  venuesWithAccountsCount?: number;
}): LeadBlockingField[] {
  const profileWithGiro = input.profile
    ? {
        ...input.profile,
        giroNegocio: input.organization?.giroNegocio ?? null,
      }
    : null;
  return resolveLeadProgress({
    lead: input.lead,
    profile: profileWithGiro,
    venuesWithAccountsCount: input.venuesWithAccountsCount,
  }).blockingFields;
}
