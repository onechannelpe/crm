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
import type {
  LeadSaleRepository,
  LeadSaleVenueRepository,
} from "../ports/sale-repository";
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

  const isBcpSoles = isBcpBank(input.solesAccount.banco);
  if (input.solesAccount.currency !== "PEN") {
    return Err(
      domainError(
        "validation",
        "invalid_soles_currency",
        "Soles account must use PEN currency",
      ),
    );
  }
  const cciSoles = isBcpSoles ? null : input.solesAccount.cci?.trim() || null;
  if (!isBcpSoles && !cciSoles) {
    return Err(
      domainError(
        "validation",
        "missing_cci_soles",
        "CCI is required for SOLES account when the bank is not BCP",
      ),
    );
  }

  const settlementCount =
    (input.solesAccount.isSettlement ? 1 : 0) +
    (input.dollarAccount?.isSettlement ? 1 : 0);
  if (settlementCount !== 1) {
    return Err(
      domainError(
        "validation",
        "invalid_settlement_account",
        "Exactly one settlement account must be selected",
      ),
    );
  }

  const sale = await deps.leadSales.findById(input.saleId);
  if (!sale) return leadNotFound();
  if (sale.leadId !== input.leadId) {
    return Err(
      domainError(
        "validation",
        "sale_lead_mismatch",
        "Sale does not belong to the specified lead",
      ),
    );
  }

  let cciDolares: string | undefined;

  if (input.dollarAccount) {
    if (input.dollarAccount.currency !== "USD") {
      return Err(
        domainError(
          "validation",
          "invalid_dollar_currency",
          "Dollar account must use USD currency",
        ),
      );
    }
    const isBcpDolares = isBcpBank(input.dollarAccount.banco);
    const normalizedCciDolares = isBcpDolares
      ? null
      : input.dollarAccount.cci?.trim() || null;
    if (!isBcpDolares && !normalizedCciDolares) {
      return Err(
        domainError(
          "validation",
          "missing_cci_dolares",
          "CCI is required for DOLARES account when the bank is not BCP",
        ),
      );
    }
    cciDolares = normalizedCciDolares ?? undefined;
  }

  const now = deps.clock.now();
  const existingVenues = await deps.leadSaleVenues.listBySaleId(input.saleId);
  const isFirstVenue = existingVenues.length === 0;
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
    ...(input.dollarAccount
      ? {
          dollarAccount: {
            currency: "USD",
            banco: input.dollarAccount.banco,
            tipoCuenta: input.dollarAccount.tipoCuenta,
            nroCuenta: input.dollarAccount.nroCuenta,
            ...(cciDolares ? { cci: cciDolares } : {}),
            isSettlement: input.dollarAccount.isSettlement,
          },
        }
      : {}),
    solesAccount: {
      currency: "PEN",
      banco: input.solesAccount.banco,
      tipoCuenta: input.solesAccount.tipoCuenta,
      nroCuenta: input.solesAccount.nroCuenta,
      ...(cciSoles ? { cci: cciSoles } : {}),
      isSettlement: input.solesAccount.isSettlement,
    },
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
      solesAccount: input.solesAccount,
      dollarAccount: input.dollarAccount,
      isFirstVenue,
    },
  });
  if (!outcome.ok) return outcome;

  return Ok({
    leadId: input.leadId,
    saleId: sale.id,
    transactionId: randomUUIDv7(),
  });
}
