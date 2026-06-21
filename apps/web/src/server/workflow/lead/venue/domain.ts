import type { SaleVenueAccount } from "~/contracts/workflow/primitives";
import { isBcpBank } from "~/contracts/workflow/vocabulary";
import type { Role } from "~/lib/auth/access/rbac";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { LeadEvent } from "~/server/workflow/lead/domain/events";
import { createHistoryEvent } from "~/server/workflow/lead/domain/history";
import { authorizeLeadAction } from "~/server/workflow/lead/domain/policy";
import type { LeadState } from "~/server/workflow/lead/domain/state";

type Actor = { userId: number; role: Role };

// Adding or editing a venue records a timeline fact during SETUP. Like an
// interaction, it authorizes against the lead and emits one event but never
// evolves the aggregate or takes its version: concurrent venue edits on one lead
// must not collide on optimistic concurrency. The write path appends these
// events without the version-checked lead update. The lead only goes LIVE once
// the last venue's accounts are funded, which is a real transition handled by
// `addVenueAccounts` in the lifecycle decider.
export function createVenue(
  state: LeadState,
  input: { actor: Actor; venueId: string; tradeName: string; now: number },
): Result<LeadEvent[], DomainError> {
  const authz = authorizeLeadAction("create-venue", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "SETUP") return Err(fail("invalid_stage"));

  return Ok([
    createHistoryEvent({
      leadId: state.id,
      eventType: "venue_added",
      actorUserId: input.actor.userId,
      payload: { venueId: input.venueId, tradeName: input.tradeName },
      occurredAt: input.now,
    }),
  ]);
}

export function updateVenue(
  state: LeadState,
  input: { actor: Actor; venueId: string; tradeName: string; now: number },
): Result<LeadEvent[], DomainError> {
  const authz = authorizeLeadAction("update-venue", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "SETUP") return Err(fail("invalid_stage"));

  return Ok([
    createHistoryEvent({
      leadId: state.id,
      eventType: "venue_updated",
      actorUserId: input.actor.userId,
      payload: { venueId: input.venueId, tradeName: input.tradeName },
      occurredAt: input.now,
    }),
  ]);
}

export type VenueAccounts = {
  solesAccount: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
};

/**
 * Validates and normalizes the bank accounts attached to a venue. This is the
 * single owner of the two account invariants, so every path that registers
 * accounts enforces them identically:
 *
 *   - Exactly one account is the settlement (abono) account. The unique index
 *     on workflow_lead_venue_accounts only blocks a second settlement row, so
 *     the "at least one" half of the rule is enforced here and nowhere else.
 *   - CCI is required for non-BCP banks and dropped for BCP accounts, where the
 *     bank code alone identifies the destination.
 *
 * The action boundary has already proven each field is present and well typed;
 * this function owns the cross-field business rules a shape parser cannot.
 */
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
  if (!soles.ok) return soles;

  if (!input.dollarAccount) {
    return Ok({ solesAccount: soles.value });
  }

  const dollar = normalizeAccount(input.dollarAccount, "dolares");
  if (!dollar.ok) return dollar;

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
