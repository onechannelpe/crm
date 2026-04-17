"use server";

import { validationError } from "~/lib/app-errors";
import { runPipelineCommand } from "~/server/pipeline/infrastructure/command-runtime";
import { createPipelineCommandApiRuntime } from "~/server/pipeline/infrastructure/runtime/pipeline-command-api-factory";
import { runAction } from "~/server/shared/action-runtime";

export async function requestSaleCreation(input: {
  leadId: number;
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
    actionName: "pipeline.create_sale",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: (ctx) =>
      runPipelineCommand((runtime) =>
        createPipelineCommandApiRuntime(runtime).createSale({
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
