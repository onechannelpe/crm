import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { resolveCapabilities } from "../../domain/lead/policy";
import type { LeadEnrichmentQueue } from "../ports/gateways";
import type { LeadReadRepository } from "../ports/lead";

type Ports = {
  leads: LeadReadRepository;
  enrichmentQueue: LeadEnrichmentQueue;
};

export async function requestSunatRefresh(
  input: {
    actor: WorkflowActor;
    leadId: string;
  },
  ports: Ports,
): Promise<Result<void, DomainError>> {
  if (!resolveCapabilities(input.actor.role).has("view")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  const lead = await ports.leads.findById(input.leadId);
  if (!lead) {
    return Err(domainError("not_found", "lead_not_found", "Lead not found"));
  }

  await ports.enrichmentQueue.enqueueRucVerification(
    lead.ruc,
    input.actor.userId,
  );

  return Ok(void 0);
}
