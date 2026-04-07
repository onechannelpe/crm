"use server";

import { approveForSale } from "~/server/pipeline/application/commands/approve-for-sale";
import { createQuotation } from "~/server/pipeline/application/commands/create-quotation";
import type { RequestQuotationCreationInput } from "~/server/pipeline/application/contracts";
import { runPipelineCommand } from "~/server/pipeline/infrastructure/command-runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function requestQuotationCreation(
  input: RequestQuotationCreationInput,
) {
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
