"use server";

import type { CreateQuotationInput } from "~/contracts/workflow/inputs";
import { MONEDAS } from "~/contracts/workflow/vocabulary";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import type { Result } from "~/server/shared/result";

import { workflowActor } from "./actor";

function parseCreateQuotation(
  input: unknown,
): Result<CreateQuotationInput, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.str("leadId"),
    paybackPricing: r.num("paybackPricing"),
    tarifaDebito: r.num("tarifaDebito"),
    tarifaCredito: r.num("tarifaCredito"),
    tarifaForaneo: r.num("tarifaForaneo"),
    fee: r.num("fee"),
    moneda: r.enum("moneda", MONEDAS),
  }));
}

function parseLeadRef(input: unknown): Result<{ leadId: string }, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.str("leadId"),
  }));
}

export async function requestQuotationCreation(input: unknown) {
  return runAction({
    actionName: "workflow.create_quotation",
    access: { kind: "auth" },
    parse: () => parseCreateQuotation(input),
    audit: ({ leadId }) => ({ leadId }),
    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.createQuotation({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}

export async function requestSaleApproval(input: unknown) {
  return runAction({
    actionName: "workflow.approve_for_sale",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    audit: ({ leadId }) => ({ leadId }),
    execute: ({ actor }, { leadId }) =>
      getServerRuntime().workflow.commands.approveForSale({
        actor: workflowActor(actor),
        leadId,
      }),
  });
}
