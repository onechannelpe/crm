"use server";

import { MONEDAS } from "~/contracts/workflow/vocabulary";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { parseObject, validationFail } from "~/server/shared/parsing";

import { workflowActor } from "./actor";

export async function requestQuotationCreation(input: unknown) {
  return runAction({
    name: "workflow.create_quotation",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.str("leadId"),
        paybackPricing: r.num("paybackPricing"),
        tarifaDebito: r.num("tarifaDebito"),
        tarifaCredito: r.num("tarifaCredito"),
        tarifaForaneo: r.num("tarifaForaneo"),
        fee: r.num("fee"),
        moneda: r.enum("moneda", MONEDAS),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.createQuotation({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}

export async function requestSaleApproval(input: unknown) {
  return runAction({
    name: "workflow.approve_for_sale",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.str("leadId"),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, { leadId }) =>
      getServerRuntime().workflow.commands.approveForSale({
        actor: workflowActor(actor),
        leadId,
      }),
  });
}
