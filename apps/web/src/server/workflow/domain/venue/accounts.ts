import type { SaleVenueAccount } from "~/contracts/workflow/primitives";
import { isBcpBank } from "~/contracts/workflow/vocabulary";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

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
    return Err(
      domainError(
        "validation",
        "invalid_settlement_account",
        "Exactly one settlement account must be selected",
      ),
    );
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
      domainError(
        "validation",
        `missing_cci_${label}`,
        `CCI is required for ${label} account when the bank is not BCP`,
      ),
    );
  }

  return Ok({ ...base, cci });
}
