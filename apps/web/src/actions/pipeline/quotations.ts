"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { getLeadDetailQuery } from "~/server/leads/application/get-lead-detail";
import { approveForSaleUseCase } from "~/server/quotations/application/approve-for-sale";
import { createQuotationUseCase } from "~/server/quotations/application/create-quotation";
import { listQuotationQueueQuery } from "~/server/quotations/application/list-quotation-queue";
import { isErr } from "~/server/shared/result";

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
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "quotation.create",
    actor,
    input: { leadId: input.leadId },
    run: async () => {
      const session = await requirePermission("quotation:manage");
      actor.userId = session.userId;
      actor.role = session.role;

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

      const result = await createQuotationUseCase({
        leadId: input.leadId,
        paybackPricing: input.paybackPricing,
        tarifaDebito: input.tarifaDebito,
        tarifaCredito: input.tarifaCredito,
        tarifaForaneo: input.tarifaForaneo,
        fee: input.fee,
        moneda: input.moneda,
        actorId: session.userId,
      });

      if (isErr(result)) throwDomainError(result.error);
      return result.value;
    },
  });
}

export async function approveLeadForSale(leadId: number): Promise<void> {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "quotation.approve_for_sale",
    actor,
    input: { leadId },
    run: async () => {
      const session = await requirePermission("quotation:manage");
      actor.userId = session.userId;
      actor.role = session.role;

      const result = await approveForSaleUseCase({
        leadId,
        actorId: session.userId,
      });

      if (isErr(result)) throwDomainError(result.error);
    },
  });
}

export async function getLeadQuotations(leadId: number) {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "quotation.list_by_lead",
    actor,
    input: { leadId },
    run: async () => {
      const session = await requirePermission("quotation:manage");
      actor.userId = session.userId;
      actor.role = session.role;

      const result = await getLeadDetailQuery({
        leadId,
        actorUserId: session.userId,
        actorRole: session.role,
      });
      if (isErr(result)) throwDomainError(result.error);
      return { lead: result.value.lead, quotations: result.value.quotations };
    },
  });
}

export async function listLeadsForQuotation(filters: {
  limit?: number;
  offset?: number;
}) {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "quotation.list_queue",
    actor,
    input: {},
    run: async () => {
      const session = await requirePermission("quotation:manage");
      actor.userId = session.userId;
      actor.role = session.role;

      return listQuotationQueueQuery(filters);
    },
  });
}
