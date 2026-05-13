"use server";

import { runAction } from "~/server/shared/action-runtime";
import { runWorkflowCommand } from "~/server/runtime/workflow-commands";
import type { Moneda } from "~/workflow/contracts/lead-schema";

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
      runWorkflowCommand(({ useCases }) =>
        useCases.createQuotation({
          actor: {
            userId: ctx.actor.userId,
            role: ctx.actor.role,
            branchId: ctx.actor.branchId,
          },
          ...input,
        }),
      ),
  });
}

export async function requestSaleApproval(leadId: string) {
  return runAction({
    actionName: "workflow.approve_for_sale",
    access: { kind: "auth" },
    input: { leadId },
    execute: (ctx) =>
      runWorkflowCommand(({ useCases }) =>
        useCases.approveForSale({
          actor: {
            userId: ctx.actor.userId,
            role: ctx.actor.role,
            branchId: ctx.actor.branchId,
          },
          leadId,
        }),
      ),
  });
}
