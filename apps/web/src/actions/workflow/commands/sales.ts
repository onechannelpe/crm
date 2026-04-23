"use server";

import { validationError } from "~/lib/app-errors";
import { runAction } from "~/server/shared/action-runtime";
import { runWorkflowCommand } from "~/server/workflow/infrastructure/command-runtime";
import { createWorkflowCommandApiRuntime } from "~/server/workflow/infrastructure/runtime/workflow-command-api-factory";

export async function requestSaleCreation(input: {
  leadId: string;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
  banco: string;
  nroCuenta: string;
  cci: string | null;
}) {
  if (!input.proveedorActual?.trim()) {
    throw validationError("proveedorActual is required");
  }
  if (!input.banco?.trim()) {
    throw validationError("banco is required");
  }
  if (!input.nroCuenta?.trim()) {
    throw validationError("nroCuenta is required");
  }

  return runAction({
    actionName: "workflow.create_sale",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: (ctx) =>
      runWorkflowCommand((runtime) =>
        createWorkflowCommandApiRuntime(runtime).createSale({
          actor: {
            userId: ctx.actor.userId,
            role: ctx.actor.role,
            branchId: ctx.actor.branchId,
          },
          ...input,
        }),
      ),
  });
}
