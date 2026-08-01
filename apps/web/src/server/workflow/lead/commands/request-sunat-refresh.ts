import { fail, type DomainError } from "~/domain/errors";
import type { OrganizationEnrichmentQueue } from "~/server/organization/enrichment";
import type { WorkflowActor } from "~/server/workflow/actor";
import { authorizeLeadAction } from "~/server/workflow/lead/domain/policy";
import type { LeadReader } from "~/server/workflow/lead/read/ports";
import { Err, Ok, type Result } from "~/shared/result";

export async function requestSunatRefresh(
  input: { actor: WorkflowActor; leadId: string },
  ports: {
    leads: LeadReader;
    enrichmentQueue: OrganizationEnrichmentQueue;
    now: Date;
  },
): Promise<Result<void, DomainError>> {
  const lead = await ports.leads.findById(input.leadId);
  if (!lead) {
    return Err(fail("lead_not_found"));
  }

  const authz = authorizeLeadAction("request-sunat-refresh", input.actor, lead);
  if (!authz.ok) {
    return authz;
  }

  await ports.enrichmentQueue.enqueueRucVerification(
    lead.ruc,
    input.actor.userId,
    ports.now,
  );

  return Ok(void 0);
}
