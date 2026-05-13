import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { leadNotFound } from "../../domain/lead/lead-errors";
import type { LeadReadRepository } from "../ports/lead-read-repository";
import type { CreateQuotationInput } from "../contracts/command-inputs";
import type { LeadQuotationResult } from "../contracts/command-results";
import {
  canCreateQuotation,
  requirePipelineActionAccess,
} from "../policies/access";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { LeadQuotationRepository } from "../ports/quotation-repository";
import type { LeadClock } from "../services/lead-clock";

type CreateQuotationCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  leadQuotations: LeadQuotationRepository;
  clock: LeadClock;
};

export async function createQuotationCommand(
  deps: CreateQuotationCommandDeps,
  input: CreateQuotationInput,
): Promise<Result<LeadQuotationResult, DomainError>> {
  const canCreate = requirePipelineActionAccess(
    input.actor.role,
    canCreateQuotation,
  );
  if (!canCreate.ok) return canCreate;

  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) return leadNotFound();

  const now = deps.clock.now();
  const version = await deps.leadQuotations.nextVersion(lead.id);
  const quotationId = await deps.leadQuotations.insert({
    leadId: lead.id,
    paybackPricing: input.paybackPricing,
    tarifaDebito: input.tarifaDebito,
    tarifaCredito: input.tarifaCredito,
    tarifaForaneo: input.tarifaForaneo,
    fee: input.fee,
    moneda: input.moneda,
    version,
    createdAt: now,
    createdBy: input.actor.userId,
  });

  const outcome = await deps.mutationUow.commit({
    lead,
    actorUserId: input.actor.userId,
    now,
    intent: {
      kind: "create_quotation",
      quotationId,
      version,
      moneda: input.moneda,
    },
  });
  if (!outcome.ok) return outcome;

  return Ok({ id: quotationId });
}
