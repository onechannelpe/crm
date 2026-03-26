"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { completeExecutiveInputUseCase } from "~/server/leads/application/complete-executive-input";
import { reassignLeadUseCase } from "~/server/leads/application/reassign-lead";
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

      const result = await completeExecutiveInputUseCase({
        leadId: input.leadId,
        proveedorActual: input.proveedorActual,
        tasaActual: input.tasaActual,
        gpv: input.gpv,
        ticket: input.ticket,
        abono: input.abono,
        cantidadPos: input.cantidadPos,
        actorId: session.userId,
        branchId: session.branchId,
      });

      if (isErr(result)) throwDomainError(result.error);
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

      const result = await reassignLeadUseCase({
        leadId: input.leadId,
        newExecutiveId: input.newExecutiveId,
        actorId: session.userId,
      });

      if (isErr(result)) throwDomainError(result.error);
    },
  });
}
