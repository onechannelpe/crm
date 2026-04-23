"use server";

import type { Moneda } from "~/pipeline/contracts/lead-schema";
import { runAction } from "~/server/shared/action-runtime";
import { runWorkflowCommand } from "~/server/workflow/infrastructure/command-runtime";
import { createWorkflowCommandApiRuntime } from "~/server/workflow/infrastructure/runtime/workflow-command-api-factory";

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
      runWorkflowCommand((runtime) =>
        createWorkflowCommandApiRuntime(runtime).createQuotation({
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
      runWorkflowCommand((runtime) =>
        createWorkflowCommandApiRuntime(runtime).approveForSale({
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
