import type { SaleVenueAccount } from "~/contracts/workflow/primitives";
import { isBcpBank } from "~/contracts/workflow/vocabulary";
import type { Role } from "~/domain/auth/access/rbac";
import { fail, type DomainError } from "~/domain/errors";
import type { UserId, WorkflowVenueId } from "~/domain/ids";
import {
  createHistoryEvent,
  type LeadHistoryEventDraft,
} from "~/server/workflow/lead/domain/history";
import { authorizeLeadAction } from "~/server/workflow/lead/domain/policy";
import type { LeadState } from "~/server/workflow/lead/domain/state";
import { Err, Ok, type Result } from "~/shared/result";

type Actor = { userId: UserId; role: Role };

export function createVenue(
  state: LeadState,
  input: {
    actor: Actor;
    venueId: WorkflowVenueId;
    tradeName: string;
    occurredAt: Date;
  },
): Result<LeadHistoryEventDraft[], DomainError> {
  const authz = authorizeLeadAction("create-venue", input.actor, state);
  if (!authz.ok) {
    return authz;
  }
  if (state.stage !== "SETUP") {
    return Err(fail("invalid_stage"));
  }

  return Ok([
    createHistoryEvent({
      leadId: state.id,
      eventType: "venue_added",
      actorUserId: input.actor.userId,
      payload: { venueId: input.venueId, tradeName: input.tradeName },
      occurredAt: input.occurredAt,
    }),
  ]);
}

export function updateVenue(
  state: LeadState,
  input: {
    actor: Actor;
    venueId: WorkflowVenueId;
    tradeName: string;
    occurredAt: Date;
  },
): Result<LeadHistoryEventDraft[], DomainError> {
  const authz = authorizeLeadAction("update-venue", input.actor, state);
  if (!authz.ok) {
    return authz;
  }
  if (state.stage !== "SETUP") {
    return Err(fail("invalid_stage"));
  }

  return Ok([
    createHistoryEvent({
      leadId: state.id,
      eventType: "venue_updated",
      actorUserId: input.actor.userId,
      payload: { venueId: input.venueId, tradeName: input.tradeName },
      occurredAt: input.occurredAt,
    }),
  ]);
}

export type VenueAccounts = {
  solesAccount: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
};

export function buildVenueAccounts(input: {
  solesAccount: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
}): Result<VenueAccounts, DomainError> {
  const settlementCount =
    (input.solesAccount.isSettlement ? 1 : 0) +
    (input.dollarAccount?.isSettlement ? 1 : 0);
  if (settlementCount !== 1) {
    return Err(fail("invalid_settlement_account"));
  }

  const soles = normalizeAccount(input.solesAccount, "soles");
  if (!soles.ok) {
    return soles;
  }

  if (!input.dollarAccount) {
    return Ok({ solesAccount: soles.value });
  }

  const dollar = normalizeAccount(input.dollarAccount, "dolares");
  if (!dollar.ok) {
    return dollar;
  }

  return Ok({ solesAccount: soles.value, dollarAccount: dollar.value });
}

function normalizeAccount<TCurrency extends "PEN" | "USD">(
  account: SaleVenueAccount & { currency: TCurrency },
  label: "soles" | "dolares",
): Result<SaleVenueAccount & { currency: TCurrency }, DomainError> {
  const base = {
    currency: account.currency,
    banco: account.banco,
    tipoCuenta: account.tipoCuenta,
    nroCuenta: account.nroCuenta,
    isSettlement: account.isSettlement,
  };

  if (isBcpBank(account.banco)) {
    return Ok(base);
  }

  const cci = account.cci?.trim() || null;
  if (!cci) {
    return Err(
      fail(label === "soles" ? "missing_cci_soles" : "missing_cci_dolares"),
    );
  }

  return Ok({ ...base, cci });
}
