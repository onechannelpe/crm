"use server";

import {
  toCreateQuotationInput,
  toLeadIdActorInput,
} from "~/actions/workflow/mappers";
import type { CreateQuotationInput, LeadIdInput } from "~/contracts/workflow";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function requestQuotationCreation(input: CreateQuotationInput) {
  return runAction({
    actionName: "workflow.create_quotation",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: (ctx) =>
      getServerRuntime().workflow.commands.createQuotation(
        toCreateQuotationInput(ctx, input),
      ),
  });
}

export async function requestSaleApproval(input: LeadIdInput) {
  return runAction({
    actionName: "workflow.approve_for_sale",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.commands.approveForSale(
        toLeadIdActorInput(ctx, input),
      ),
  });
}
