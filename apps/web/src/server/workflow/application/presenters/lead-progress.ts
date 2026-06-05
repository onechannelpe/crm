import type { LeadNextStep } from "~/contracts/workflow/vocabulary";

import {
  resolveLeadProgress,
  type LeadBlockingField,
} from "../../domain/lead-progress";
import type { LeadState } from "../../domain/lead/state";
import type { LeadProfile, OrganizationProfile } from "../ports/entities";

export function presentLeadNextStep(input: {
  lead: Pick<LeadState, "stage">;
}): LeadNextStep {
  return resolveLeadProgress({
    lead: input.lead,
  }).nextStep;
}

export function presentLeadBlockingFields(input: {
  lead: Pick<LeadState, "stage">;
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
