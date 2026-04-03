"use server";

import { approveForSale } from "~/server/pipeline/application/commands/approve-for-sale";
import { createQuotation } from "~/server/pipeline/application/commands/create-quotation";
import { runPipelineCommand } from "~/server/pipeline/infrastructure/runtime";
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
    requireAuth: true,
    input: { leadId: input.leadId },
    execute: (ctx) =>
      runPipelineCommand(({ deps, auditService }) =>
        createQuotation({
          deps: deps.createQuotation,
          auditService,
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          ...input,
        }),
      ),
  });
}

export async function requestSaleApproval(leadId: number) {
  return runAction({
    actionName: "pipeline.approve_for_sale",
    requireAuth: true,
    input: { leadId },
    execute: (ctx) =>
      runPipelineCommand(({ deps, auditService, notificationCenter }) =>
        approveForSale({
          deps: deps.approveForSale,
          auditService,
          notificationCenter,
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          leadId,
        }),
      ),
  });
}
