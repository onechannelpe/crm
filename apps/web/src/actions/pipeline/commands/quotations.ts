"use server";

import { approveForSale } from "~/server/pipeline/application/commands/approve-for-sale";
import { createQuotation } from "~/server/pipeline/application/commands/create-quotation";
import { runAction } from "~/server/shared/action-runtime";

export async function requestQuotationCreation(input: {
  leadId: number;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: "PEN" | "USD";
}) {
  return runAction({
    actionName: "pipeline.create_quotation",
    permission: "quotation:manage",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      createQuotation({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        ...input,
      }),
  });
}

export async function requestSaleApproval(leadId: number) {
  return runAction({
    actionName: "pipeline.approve_for_sale",
    permission: "quotation:manage",
    input: { leadId },
    execute: (ctx) =>
      approveForSale({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId,
      }),
  });
}
