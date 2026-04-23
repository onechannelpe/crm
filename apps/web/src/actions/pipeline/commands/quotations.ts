"use server";

import type { Moneda } from "~/pipeline/contracts/lead-schema";
import { runPipelineCommand } from "~/server/pipeline/infrastructure/command-runtime";
import { createPipelineCommandApiRuntime } from "~/server/pipeline/infrastructure/runtime/pipeline-command-api-factory";
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
    actionName: "pipeline.create_quotation",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: (ctx) =>
      runPipelineCommand((runtime) =>
        createPipelineCommandApiRuntime(runtime).createQuotation({
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
    actionName: "pipeline.approve_for_sale",
    access: { kind: "auth" },
    input: { leadId },
    execute: (ctx) =>
      runPipelineCommand((runtime) =>
        createPipelineCommandApiRuntime(runtime).approveForSale({
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
