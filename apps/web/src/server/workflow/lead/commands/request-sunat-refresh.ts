import type { OrganizationEnrichmentQueue } from "~/server/identity/organization/enrichment";
import {
  fail,
  forbidden,
  type DomainError,
} from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";
import { resolveCapabilities } from "~/server/workflow/lead/domain/policy";
import type { LeadReader } from "~/server/workflow/lead/read/ports";

export async function requestSunatRefresh(
  input: { actor: WorkflowActor; leadId: string },
  ports: { leads: LeadReader; enrichmentQueue: OrganizationEnrichmentQueue },
): Promise<Result<void, DomainError>> {
  if (!resolveCapabilities(input.actor.role).has("view")) {
    return Err(forbidden());
  }

  const lead = await ports.leads.findById(input.leadId);
  if (!lead) {
    return Err(fail("lead_not_found"));
  }

  await ports.enrichmentQueue.enqueueRucVerification(
    lead.ruc,
    input.actor.userId,
  );

  return Ok(void 0);
}
