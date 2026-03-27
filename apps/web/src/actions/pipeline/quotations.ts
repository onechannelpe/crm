"use server";

import { validationError } from "~/lib/app-errors";
import { getLeadDetailQuery } from "~/server/leads/application/get-lead-detail";
import { approveForSaleUseCase } from "~/server/quotations/application/approve-for-sale";
import { createQuotationUseCase } from "~/server/quotations/application/create-quotation";
import { listQuotationQueueQuery } from "~/server/quotations/application/list-quotation-queue";
import { runAction } from "~/server/shared/action-runtime";
import { isErr, Ok } from "~/server/shared/result";

export interface CreateQuotationInput {
  leadId: number;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: string;
}

export async function createQuotation(
  input: CreateQuotationInput,
): Promise<{ id: number }> {
  if (input.moneda !== "PEN" && input.moneda !== "USD") {
    throw validationError("moneda must be PEN or USD");
  }
  for (const [key, val] of Object.entries(input)) {
    if (
      key !== "leadId" &&
      key !== "moneda" &&
      typeof val === "number" &&
      val < 0
    ) {
      throw validationError(`${key} must be non-negative`);
    }
  }

  return runAction({
    actionName: "quotation.create",
    permission: "quotation:manage",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      createQuotationUseCase({
        leadId: input.leadId,
        paybackPricing: input.paybackPricing,
        tarifaDebito: input.tarifaDebito,
        tarifaCredito: input.tarifaCredito,
        tarifaForaneo: input.tarifaForaneo,
        fee: input.fee,
        moneda: input.moneda,
        actorId: ctx.actor.userId,
      }),
  });
}

export async function approveLeadForSale(leadId: number): Promise<void> {
  return runAction({
    actionName: "quotation.approve_for_sale",
    permission: "quotation:manage",
    input: { leadId },
    execute: (ctx) =>
      approveForSaleUseCase({
        leadId,
        actorId: ctx.actor.userId,
      }),
  });
}

export async function getLeadQuotations(leadId: number) {
  return runAction({
    actionName: "quotation.list_by_lead",
    permission: "quotation:manage",
    input: { leadId },
    execute: async (ctx) => {
      const result = await getLeadDetailQuery({
        leadId,
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
      });
      if (isErr(result)) return result;
      return Ok({
        lead: result.value.lead,
        quotations: result.value.quotations,
      });
    },
  });
}

export async function listLeadsForQuotation(filters: {
  limit?: number;
  offset?: number;
}) {
  return runAction({
    actionName: "quotation.list_queue",
    permission: "quotation:manage",
    input: {},
    execute: async () => Ok(await listQuotationQueueQuery(filters)),
  });
}
