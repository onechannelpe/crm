"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { notFoundError, validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import {
  appNotificationCenter,
  leadWorkflowService,
  repos,
} from "~/server/shared/context";
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

      const result = await leadWorkflowService.createQuotation({
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
      return { id: result.value };
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

      const result = await leadWorkflowService.approveForSale({
        leadId,
        actorId: session.userId,
      });

      if (isErr(result)) throwDomainError(result.error);

      const lead = await repos.leads.findById(leadId);
      if (lead) {
        await appNotificationCenter.notifyUsers([lead.executive_id], {
          type: "lead.ready_for_sale",
          title: "Lead listo para venta",
          bodyText: `El lead RUC ${lead.ruc} fue aprobado. Puedes registrar la venta.`,
          actionUrl: `/sales/new/${lead.id}`,
          priority: "high",
          dedupeKey: `lead_rfs_${lead.id}`,
        });
      }
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

      const lead = await repos.leads.findById(leadId);
      if (!lead) throw notFoundError("Lead not found");

      const quotations = await repos.quotations.listByLead(leadId);
      return { lead, quotations };
    },
  });
}
