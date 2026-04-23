import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import { isBcpBank } from "~/workflow/contracts/lead-schema";

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
  const banco = input.banco.trim();
  const isBcp = isBcpBank(banco);
  const cci = isBcp ? null : input.cci?.trim() || null;
  if (!isBcp && !cci) {
    return Err(
      domainError(
        "validation",
        "missing_cci",
        "CCI is required when the selected bank is not BCP",
      ),
    );
  }

  const now = deps.clock.now();
  const saleId = await deps.leadSales.insert({
    leadId: lead.id,
    executiveId: input.actor.userId,
    proveedorActual: input.proveedorActual,
    tasaActual: input.tasaActual,
    gpv: input.gpv,
    ticket: input.ticket,
    abono: input.abono,
    cantidadPos: input.cantidadPos,
    banco,
    nroCuenta: input.nroCuenta,
    cci,
    createdAt: now,
  });

  const outcome = await deps.mutationUow.commit({
    lead,
    actorUserId: input.actor.userId,
    now,
    intent: { kind: "create_sale", saleId },
  });
  if (!outcome.ok) return outcome;

  return Ok({ id: saleId });
}
