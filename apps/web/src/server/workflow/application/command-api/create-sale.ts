import { randomUUIDv7 } from "bun";

import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { isReadyForSaleLeadSubject } from "../../domain/lead-subjects";
import { invalidLeadStage, leadNotFound } from "../../domain/lead/lead-errors";
import type { LeadReadRepository } from "../../ports/lead-read-repository";
import type { CreateSaleInput } from "../contracts/command-inputs";
import type { LeadSaleResult } from "../contracts/command-results";
import { canCreateSale, requirePipelineActionAccess } from "../policies/access";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { LeadSaleRepository } from "../ports/sale-repository";
import type { LeadClock } from "../services/lead-clock";

type CreateSaleCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  leadSales: LeadSaleRepository;
  clock: LeadClock;
};

export async function createSaleCommand(
  deps: CreateSaleCommandDeps,
  input: CreateSaleInput,
): Promise<Result<LeadSaleResult, DomainError>> {
  const canCreate = requirePipelineActionAccess(
    input.actor.role,
    canCreateSale,
  );
  if (!canCreate.ok) return canCreate;

  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) return leadNotFound();
  if (!isReadyForSaleLeadSubject(lead)) return invalidLeadStage();

  if (lead.executiveId !== input.actor.userId) {
    return Err(
      domainError(
        "forbidden",
        "not_owner",
        "Only the assigned executive can create the sale",
      ),
    );
  }

  const now = deps.clock.now();
  const saleId = await deps.leadSales.insert({
    leadId: lead.id,
    executiveId: input.actor.userId,
    createdAt: now,
  });

  const outcome = await deps.mutationUow.commit({
    lead,
    actorUserId: input.actor.userId,
    now,
    intent: { kind: "create_sale", saleId },
  });
  if (!outcome.ok) return outcome;

  return Ok({
    leadId: input.leadId,
    saleId,
    transactionId: randomUUIDv7(),
  });
}
