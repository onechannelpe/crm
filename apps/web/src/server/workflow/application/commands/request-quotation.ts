import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type {
  LeadCommandResult,
  RequestQuotationInput,
} from "~/server/workflow/types";

import { resolveLeadBlockingFields } from "../../domain/lead-progress";
import { leadNotFound } from "../../domain/lead/lead-errors";
import {
  canCompleteScoping,
  requirePipelineActionAccess,
} from "../policies/access";
import type { LeadProfileRepository, PartyRepository } from "../ports/entities";
import type { LeadMutationUow, LeadReadRepository } from "../ports/lead";
import type { LeadClock } from "../services/lead-clock";

type RequestQuotationCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  leadProfiles: LeadProfileRepository;
  party: PartyRepository;
  clock: LeadClock;
};

export async function requestQuotationCommand(
  deps: RequestQuotationCommandDeps,
  input: RequestQuotationInput,
): Promise<Result<LeadCommandResult, DomainError>> {
  const canRequest = requirePipelineActionAccess(
    input.actor.role,
    canCompleteScoping,
  );
  if (!canRequest.ok) return canRequest;

  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) return leadNotFound();

  if (lead.executiveId !== input.actor.userId) {
    return Err(
      domainError(
        "forbidden",
        "not_owner",
        "Only the assigned executive can request a quotation",
      ),
    );
  }

  if (lead.stage !== "SCOPING") {
    return Err(
      domainError("validation", "wrong_stage", "Lead is not in SCOPING stage"),
    );
  }

  const [profile, organization] = await Promise.all([
    deps.leadProfiles.findByLeadId(lead.id),
    deps.party.findOrganizationById(lead.organizationId),
  ]);

  const profileWithGiro = profile
    ? { ...profile, giroNegocio: organization?.giroNegocio ?? null }
    : null;

  const blockingFields = resolveLeadBlockingFields({
    stage: lead.stage,
    profile: profileWithGiro,
  });

  if (blockingFields.length > 0) {
    return Err(
      domainError(
        "conflict",
        "blocking_fields_present",
        "Commercial scope is incomplete",
      ),
    );
  }

  const now = deps.clock.now();
  const outcome = await deps.mutationUow.commit({
    lead,
    actorUserId: input.actor.userId,
    now,
    intent: { kind: "request_quotation" },
  });
  if (!outcome.ok) return outcome;

  return Ok({ leadId: lead.id });
}
