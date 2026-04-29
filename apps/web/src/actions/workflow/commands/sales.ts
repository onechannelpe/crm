"use server";

import { validationError } from "~/lib/app-errors";
import { runAction } from "~/server/shared/action-runtime";
import { runWorkflowCommand } from "~/server/workflow/infrastructure/command-runtime";
import type { AbonoBank, AccountTypeKind } from "~/workflow/contracts/lead-schema";

export async function requestSaleCreation(input: {
  leadId: string;
}) {
  return runAction({
    actionName: "workflow.create_sale",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: (ctx) =>
      runWorkflowCommand(({ commandApi }) =>
        commandApi.createSale({
          actor: {
            userId: ctx.actor.userId,
            role: ctx.actor.role,
            branchId: ctx.actor.branchId,
          },
          leadId: input.leadId,
        }),
      ),
  });
}

export async function requestSaleVenueCreation(input: {
  leadId: string;
  saleId: string;
  nombreComercial: string;
  cantidadPos: number;
  direccion: string;
  referencia: string | null;
  distrito: string;
  provincia: string;
  departamento: string;
  bancoSoles: AbonoBank;
  tipoCuentaSoles: AccountTypeKind;
  nroCuentaSoles: string;
  cciSoles: string | null;
  bancoDolares: AbonoBank | null;
  tipoCuentaDolares: AccountTypeKind | null;
  nroCuentaDolares: string | null;
  cciDolares: string | null;
  abono: AbonoBank;
}) {
  if (!input.nombreComercial.trim()) {
    throw validationError("nombreComercial is required");
  }
  if (!input.direccion.trim()) {
    throw validationError("direccion is required");
  }
  if (!input.distrito.trim()) {
    throw validationError("distrito is required");
  }
  if (!input.provincia.trim()) {
    throw validationError("provincia is required");
  }
  if (!input.departamento.trim()) {
    throw validationError("departamento is required");
  }
  if (!input.nroCuentaSoles.trim()) {
    throw validationError("nroCuentaSoles is required");
  }

  const hasAnyUsdField = Boolean(
    input.bancoDolares ||
      input.tipoCuentaDolares ||
      input.nroCuentaDolares?.trim() ||
      input.cciDolares?.trim(),
  );
  const hasAllUsdFields = Boolean(
    input.bancoDolares &&
      input.tipoCuentaDolares &&
      input.nroCuentaDolares?.trim(),
  );
  if (hasAnyUsdField && !hasAllUsdFields) {
    throw validationError("dollar account fields must be complete");
  }

  return runAction({
    actionName: "workflow.create_sale_venue",
    access: { kind: "auth" },
    input: { leadId: input.leadId, saleId: input.saleId },
    execute: (ctx) =>
      runWorkflowCommand(({ commandApi }) =>
        commandApi.createSaleVenue({
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
