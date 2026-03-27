"use server";

import { validationError } from "~/lib/app-errors";
import { runAction } from "~/server/shared/action-runtime";
import { completeExecutiveInputUseCase } from "~/server/leads/application/complete-executive-input";
import { reassignLeadUseCase } from "~/server/leads/application/reassign-lead";

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

  return runAction({
    actionName: "lead.complete_executive_input",
    permission: "lead:register",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      completeExecutiveInputUseCase({
        leadId: input.leadId,
        proveedorActual: input.proveedorActual,
        tasaActual: input.tasaActual,
        gpv: input.gpv,
        ticket: input.ticket,
        abono: input.abono,
        cantidadPos: input.cantidadPos,
        actorId: ctx.actor.userId,
        branchId: ctx.actor.branchId,
      }),
  });
}

export async function reassignLead(input: {
  leadId: number;
  newExecutiveId: number;
}): Promise<void> {
  return runAction({
    actionName: "lead.reassign",
    permission: "lead:reassign",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      reassignLeadUseCase({
        leadId: input.leadId,
        newExecutiveId: input.newExecutiveId,
        actorId: ctx.actor.userId,
      }),
  });
}
