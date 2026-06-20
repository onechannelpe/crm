import {
  fail,
  forbidden,
  type DomainError,
} from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { LeadEnrichmentQueue } from "~/server/workflow/infrastructure/ports/gateways";
import type { LeadReadRepository } from "~/server/workflow/infrastructure/ports/lead";
import type { WorkflowActor } from "~/server/workflow/types";

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
