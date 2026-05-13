import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import { isBcpBank } from "~/workflow/contracts/lead-schema";

import { leadNotFound } from "../../domain/lead/lead-errors";
import type { LeadReadRepository } from "../ports/lead-read-repository";
import type { AddVenueAccountsInput } from "../contracts/command-inputs";
import type { LeadCommandResult } from "../contracts/command-results";
import { canCreateSale, requirePipelineActionAccess } from "../policies/access";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { LeadVenueRepository } from "../ports/sale-repository";
import type { LeadClock } from "../services/lead-clock";

type AddVenueAccountsCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  leadVenues: LeadVenueRepository;
  clock: LeadClock;
};

export async function addVenueAccountsCommand(
  deps: AddVenueAccountsCommandDeps,
  input: AddVenueAccountsInput,
): Promise<Result<LeadCommandResult, DomainError>> {
  const canCreate = requirePipelineActionAccess(
    input.actor.role,
    canCreateSale,
  );
  if (!canCreate.ok) return canCreate;

  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) return leadNotFound();

  if (lead.executiveId !== input.actor.userId) {
    return Err(
      domainError(
        "forbidden",
        "not_owner",
        "Only the assigned executive can add venue accounts",
      ),
    );
  }

  if (input.solesAccount.currency !== "PEN") {
    return Err(
      domainError(
        "validation",
        "invalid_soles_currency",
        "Soles account must use PEN currency",
      ),
    );
  }

  const isBcpSoles = isBcpBank(input.solesAccount.banco);
  const cciSoles = isBcpSoles ? null : input.solesAccount.cci?.trim() || null;
  if (!isBcpSoles && !cciSoles) {
    return Err(
      domainError(
        "validation",
        "missing_cci_soles",
        "CCI is required for soles account when the bank is not BCP",
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
          "CCI is required for dollar account when the bank is not BCP",
        ),
      );
    }
    cciDolares = normalizedCciDolares ?? undefined;
  }

  const now = deps.clock.now();
  const venueResult = await deps.leadVenues.findById(input.venueId);
  if (!venueResult.ok) return venueResult;
  if (!venueResult.value || venueResult.value.leadId !== input.leadId) {
    return Err(
      domainError(
        "not_found",
        "venue_not_found",
        "Venue not found for this lead",
      ),
    );
  }
  if (venueResult.value.solesAccount) {
    return Err(
      domainError(
        "conflict",
        "accounts_already_added",
        "This venue already has accounts registered",
      ),
    );
  }

  await deps.leadVenues.addAccounts(
    input.venueId,
    {
      solesAccount: {
        currency: "PEN",
        banco: input.solesAccount.banco,
        tipoCuenta: input.solesAccount.tipoCuenta,
        nroCuenta: input.solesAccount.nroCuenta,
        ...(cciSoles ? { cci: cciSoles } : {}),
        isSettlement: input.solesAccount.isSettlement,
      },
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
    },
    now,
  );

  const [totalVenues, venuesWithAccounts] = await Promise.all([
    deps.leadVenues.countByLeadId(input.leadId),
    deps.leadVenues.countWithAccounts(input.leadId),
  ]);
  const shouldTransitionToLive =
    totalVenues > 0 && venuesWithAccounts === totalVenues;

  const outcome = await deps.mutationUow.commit({
    lead,
    actorUserId: input.actor.userId,
    now,
    intent: {
      kind: "add_venue_accounts",
      venueId: input.venueId,
      shouldTransitionToLive,
    },
  });
  if (!outcome.ok) return outcome;

  return Ok({ leadId: lead.id });
}
