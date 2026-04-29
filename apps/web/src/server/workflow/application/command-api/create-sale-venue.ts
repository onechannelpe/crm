import { randomUUIDv7 } from "bun";

import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import { isBcpBank } from "~/workflow/contracts/lead-schema";

import { isReadyForSaleLeadSubject } from "../../domain/lead-subjects";
import { invalidLeadStage, leadNotFound } from "../../domain/lead/lead-errors";
import type { LeadReadRepository } from "../../ports/lead-read-repository";
import type { CreateSaleVenueInput } from "../contracts/command-inputs";
import type { LeadSaleResult } from "../contracts/command-results";
import { canCreateSale, requirePipelineActionAccess } from "../policies/access";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { LeadSaleRepository, LeadSaleVenueRepository } from "../ports/sale-repository";
import type { LeadClock } from "../services/lead-clock";

type CreateSaleVenueCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  leadSales: LeadSaleRepository;
  leadSaleVenues: LeadSaleVenueRepository;
  clock: LeadClock;
};

export async function createSaleVenueCommand(
  deps: CreateSaleVenueCommandDeps,
  input: CreateSaleVenueInput,
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
        "Only the assigned executive can create venue data",
      ),
    );
  }

  const isBcpSoles = isBcpBank(input.bancoSoles);
  const cciSoles = isBcpSoles ? null : input.cciSoles?.trim() || null;
  if (!isBcpSoles && !cciSoles) {
    return Err(
      domainError(
        "validation",
        "missing_cci_soles",
        "CCI is required for SOLES account when the bank is not BCP",
      ),
    );
  }

  if (input.bancoDolares) {
    const isBcpDolares = isBcpBank(input.bancoDolares);
    const cciDolares = isBcpDolares ? null : input.cciDolares?.trim() || null;
    if (!isBcpDolares && !cciDolares) {
      return Err(
        domainError(
          "validation",
          "missing_cci_dolares",
          "CCI is required for DOLARES account when the bank is not BCP",
        ),
      );
    }
  }

  const now = deps.clock.now();
  const venueId = await deps.leadSaleVenues.insert({
    saleId: input.saleId,
    leadId: input.leadId,
    nombreComercial: input.nombreComercial,
    cantidadPos: input.cantidadPos,
    direccion: input.direccion,
    referencia: input.referencia,
    distrito: input.distrito,
    provincia: input.provincia,
    departamento: input.departamento,
    bancoSoles: input.bancoSoles,
    tipoCuentaSoles: input.tipoCuentaSoles,
    nroCuentaSoles: input.nroCuentaSoles,
    cciSoles,
    bancoDolares: input.bancoDolares,
    tipoCuentaDolares: input.tipoCuentaDolares,
    nroCuentaDolares: input.nroCuentaDolares,
    cciDolares: input.cciDolares,
    abono: input.abono,
    createdAt: now,
    createdBy: input.actor.userId,
  });

  const outcome = await deps.mutationUow.commit({
    lead,
    actorUserId: input.actor.userId,
    now,
    intent: {
      kind: "create_sale_venue",
      venueId,
      saleId: input.saleId,
      nombreComercial: input.nombreComercial,
      cantidadPos: input.cantidadPos,
      direccion: input.direccion,
      referencia: input.referencia,
      distrito: input.distrito,
      provincia: input.provincia,
      departamento: input.departamento,
      bancoSoles: input.bancoSoles,
      tipoCuentaSoles: input.tipoCuentaSoles,
      nroCuentaSoles: input.nroCuentaSoles,
      cciSoles,
      bancoDolares: input.bancoDolares,
      tipoCuentaDolares: input.tipoCuentaDolares,
      nroCuentaDolares: input.nroCuentaDolares,
      cciDolares: input.cciDolares,
      abono: input.abono,
      isFirstVenue: input.leadId ? false : true,
    },
  });
  if (!outcome.ok) return outcome;

  const sale = await deps.leadSales.findById(input.saleId);
  if (!sale) return leadNotFound();

  return Ok({
    leadId: input.leadId,
    saleId: sale.id,
    transactionId: randomUUIDv7(),
  });
}
