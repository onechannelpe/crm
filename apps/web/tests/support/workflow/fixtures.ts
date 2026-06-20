import type { LeadCommercialScope } from "~/server/workflow/lead/domain/state";

/**
 * Named commercial personas, the single owner of the "default commercial snapshot".
 *
 * Before this existed the same tuple was hardcoded in seed.ts and register.ts and
 * re-asserted as bare literals in tests. The redesign makes these fields NOT NULL on
 * the lead, so the default is a real domain concept that needs one home. Tests assert
 * `MERCHANT.standard.currentDebitRate`, never a bare `3.5`.
 */
export const MERCHANT = {
  standard: {
    currentProvider: "Niubiz",
    currentDebitRate: 3.5,
    currentCreditRate: 4,
    gpv: 50_000,
    ticket: 120,
    settlementBank: "BCP",
    posCount: 2,
  },
} as const satisfies Record<string, LeadCommercialScope>;
