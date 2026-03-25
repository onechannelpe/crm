"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import {
  appNotificationCenter,
  leadWorkflowService,
  repos,
} from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

export interface CompleteExecutiveInputInput {
  leadId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
}

export async function completeExecutiveInput(
  input: CompleteExecutiveInputInput,
): Promise<void> {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "lead.complete_executive_input",
    actor,
    input: { leadId: input.leadId },
    run: async () => {
      const session = await requirePermission("lead:register");
      actor.userId = session.userId;
      actor.role = session.role;

      if (!input.proveedorActual?.trim()) {
        throw validationError("proveedorActual is required");
      }
      for (const [key, val] of [
        ["tasaActual", input.tasaActual],
        ["gpv", input.gpv],
        ["ticket", input.ticket],
        ["abono", input.abono],
      ] as [string, number][]) {
        if (typeof val !== "number" || val < 0) {
          throw validationError(`${key} must be a non-negative number`);
        }
      }
      if (
        typeof input.cantidadPos !== "number" ||
        input.cantidadPos < 0 ||
        !Number.isInteger(input.cantidadPos)
      ) {
        throw validationError("cantidadPos must be a non-negative integer");
      }

      const result = await leadWorkflowService.completeExecutiveInput({
        leadId: input.leadId,
        proveedorActual: input.proveedorActual,
        tasaActual: input.tasaActual,
        gpv: input.gpv,
        ticket: input.ticket,
        abono: input.abono,
        cantidadPos: input.cantidadPos,
        actorId: session.userId,
      });

      if (isErr(result)) throwDomainError(result.error);

      const lead = await repos.leads.findById(input.leadId);
      if (lead?.stage === "READY_FOR_QUOTATION") {
        await appNotificationCenter.notifyBranchRoles(
          session.branchId,
          ["back_office"],
          {
            type: "lead.ready_for_quotation",
            title: "Lead listo para cotizacion",
            bodyText: `El lead RUC ${lead.ruc} ya tiene informacion completa`,
            actionUrl: `/quotations/${lead.id}`,
            priority: "normal",
            dedupeKey: `lead_rfq_${lead.id}`,
          },
        );
      }
    },
  });
}

export async function reassignLead(input: {
  leadId: number;
  newExecutiveId: number;
}): Promise<void> {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "lead.reassign",
    actor,
    input: { leadId: input.leadId },
    run: async () => {
      const session = await requirePermission("lead:reassign");
      actor.userId = session.userId;
      actor.role = session.role;

      const result = await leadWorkflowService.reassignLead({
        leadId: input.leadId,
        newExecutiveId: input.newExecutiveId,
        actorId: session.userId,
      });

      if (isErr(result)) throwDomainError(result.error);
    },
  });
}
