"use server";

import { workflowActorFrom } from "~/actions/workflow/shared";
import type { Moneda } from "~/contracts/workflow";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function requestQuotationCreation(input: {
  leadId: string;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: Moneda;
}) {
  return runAction({
    actionName: "workflow.create_quotation",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: (ctx) =>
      getServerRuntime().workflow.commands.createQuotation({
        actor: workflowActorFrom(ctx),
        ...input,
      }),
  });
}

export async function requestSaleApproval(leadId: string) {
  return runAction({
    actionName: "workflow.approve_for_sale",
    access: { kind: "auth" },
    input: { leadId },
    execute: (ctx) =>
      getServerRuntime().workflow.commands.approveForSale({
        actor: workflowActorFrom(ctx),
        leadId,
      }),
  });
}
