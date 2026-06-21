import type { LeadCommercialScope } from "~/server/workflow/lead/domain/state";

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
