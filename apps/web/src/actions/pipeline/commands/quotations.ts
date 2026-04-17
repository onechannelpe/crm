"use server";

import { type LeadId } from "~/server/pipeline/domain/lead-record";
import { runPipelineCommand } from "~/server/pipeline/infrastructure/command-runtime";
import { createPipelineCommandApiRuntime } from "~/server/pipeline/infrastructure/runtime/pipeline-command-api-factory";
import { runAction } from "~/server/shared/action-runtime";

export async function requestQuotationCreation(input: {
  leadId: LeadId;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: "PEN" | "USD";
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

export async function requestSaleApproval(leadId: LeadId) {
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
