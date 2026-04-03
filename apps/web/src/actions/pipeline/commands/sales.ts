"use server";

import { validationError } from "~/lib/app-errors";
import { createSale } from "~/server/pipeline/application/commands/create-sale";
import { createSaleDeps } from "~/server/pipeline/infrastructure/deps";
import { runAction } from "~/server/shared/action-runtime";

import { runPipelineCommand } from "../runtime/commands";

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
    permission: "lead:register",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      runPipelineCommand(createSaleDeps, ({ deps, auditService }) =>
        createSale(deps, auditService, {
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          ...input,
        }),
      ),
  });
}
