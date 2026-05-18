import { randomUUIDv7 } from "bun";

import type { SaleVenueAccount } from "~/contracts/workflow/primitives";
import { isBcpBank } from "~/contracts/workflow/vocabulary";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import { parseRequiredLeadText } from "../../domain/lead-schema-parser";
import { leadNotFound } from "../../domain/lead/lead-errors";
import { addVenueAccounts } from "../../domain/lead/transitions";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createLeadUow } from "../../infrastructure/uow";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";

type Ports = {
  executor: DatabaseExecutor;
};

export async function addVenueAccountsCommand(
  input: {
    actor: WorkflowActor;
    leadId: string;
    venueId: string;
    solesAccount: SaleVenueAccount & { currency: "PEN" };
    dollarAccount?: SaleVenueAccount & { currency: "USD" };
    idempotencyKey?: string;
  },
  ports: Ports,
): Promise<Result<{ leadId: string }, DomainError>> {
  const solesNroCuenta = parseRequiredLeadText(
    input.solesAccount.nroCuenta,
    "soles_account_number_required",
    "Soles account number is required",
  );
  if (!solesNroCuenta.ok) return solesNroCuenta;

  const dollarNroCuenta = input.dollarAccount
    ? parseRequiredLeadText(
        input.dollarAccount.nroCuenta,
        "dollar_account_number_required",
        "Dollar account number is required",
      )
    : null;
  if (dollarNroCuenta && !dollarNroCuenta.ok) return dollarNroCuenta;

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

  let cciDolares: string | null = null;
  if (input.dollarAccount) {
    const isBcpDolares = isBcpBank(input.dollarAccount.banco);
    cciDolares = isBcpDolares ? null : input.dollarAccount.cci?.trim() || null;
    if (!isBcpDolares && !cciDolares) {
      return Err(
        domainError(
          "validation",
          "missing_cci_dolares",
          "CCI is required for dollar account when the bank is not BCP",
        ),
      );
    }
  }

  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);
    const uow = createLeadUow(tx);

    const state = await leads.findById(input.leadId);
    if (!state) return leadNotFound();

    const venueResult = await repos.leadVenues.findById(input.venueId);
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

    const now = Date.now();
    const [totalVenues, venuesWithAccounts] = await Promise.all([
      repos.leadVenues.countByLeadId(input.leadId),
      repos.leadVenues.countWithAccounts(input.leadId),
    ]);
    const shouldTransitionToLive =
      totalVenues > 0 && venuesWithAccounts + 1 === totalVenues;

    const transition = addVenueAccounts(state, {
      actor: input.actor,
      venueId: input.venueId,
      shouldTransitionToLive,
      now,
    });
    if (!transition.ok) return transition;

    await repos.leadVenues.addAccounts(
      input.venueId,
      {
        solesAccount: {
          currency: "PEN",
          banco: input.solesAccount.banco,
          tipoCuenta: input.solesAccount.tipoCuenta,
          nroCuenta: solesNroCuenta.value,
          ...(cciSoles ? { cci: cciSoles } : {}),
          isSettlement: input.solesAccount.isSettlement,
        },
        ...(input.dollarAccount
          ? {
              dollarAccount: {
                currency: "USD",
                banco: input.dollarAccount.banco,
                tipoCuenta: input.dollarAccount.tipoCuenta,
                nroCuenta: dollarNroCuenta!.value,
                ...(cciDolares ? { cci: cciDolares } : {}),
                isSettlement: input.dollarAccount.isSettlement,
              },
            }
          : {}),
      },
      now,
    );

    const committed = await uow.commit({
      next: transition.value.next,
      events: transition.value.events,
      idempotencyKey: input.idempotencyKey ?? randomUUIDv7(),
    });
    if (!committed.ok) return committed;

    return Ok({ leadId: state.id });
  });
}
