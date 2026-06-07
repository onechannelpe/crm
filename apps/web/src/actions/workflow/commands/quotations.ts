"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { parseCreateQuotationInput } from "./input";

export async function requestQuotationCreation(input: unknown) {
  return runAction({
    actionName: "workflow.create_quotation",
    access: { kind: "auth" },
    input,

    execute: async ({ actor }) => {
      const parsedInput = parseCreateQuotationInput(input);
      if (!parsedInput.ok) return parsedInput;

      return getServerRuntime().workflow.commands.createQuotation({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: parsedInput.value.leadId,
        paybackPricing: parsedInput.value.paybackPricing,
        tarifaDebito: parsedInput.value.tarifaDebito,
        tarifaCredito: parsedInput.value.tarifaCredito,
        tarifaForaneo: parsedInput.value.tarifaForaneo,
        fee: parsedInput.value.fee,
        moneda: parsedInput.value.moneda,
      });
    },
  });
}

export async function requestSaleApproval(input: { leadId: string }) {
  return runAction({
    actionName: "workflow.approve_for_sale",
    access: { kind: "auth" },
    input,

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.approveForSale({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
      }),
  });
}
