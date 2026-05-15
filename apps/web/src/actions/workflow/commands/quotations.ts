"use server";

import { type CreateQuotationInput } from "~/contracts/workflow/inputs";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function requestQuotationCreation(input: CreateQuotationInput) {
  return runAction({
    actionName: "workflow.create_quotation",
    access: { kind: "auth" },
    input: { leadId: input.leadId },

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.createQuotation({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        ...input,
      }),
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
