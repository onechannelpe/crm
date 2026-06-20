import {
  fail,
  forbidden,
  type DomainError,
} from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";
import type { LeadReadRepository } from "~/server/workflow/lead/read/queries-port";
import type { LeadEnrichmentQueue } from "~/server/workflow/lead/write/engine-port";

import { resolveCapabilities } from "../../lead/domain/policy";

export async function requestSunatRefresh(
  input: { actor: WorkflowActor; leadId: string },
  ports: { leads: LeadReadRepository; enrichmentQueue: LeadEnrichmentQueue },
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
