"use server";

import { validationError } from "~/lib/app-errors";
import { runAction } from "~/server/shared/action-runtime";
import { runWorkflowCommand } from "~/server/workflow/infrastructure/command-runtime";
import type {
  AbonoBank,
  AccountTypeKind,
} from "~/workflow/contracts/lead-schema";

export async function requestSaleContainerCreation(input: { leadId: string }) {
  return runAction({
    actionName: "workflow.create_sale_container",
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

export const requestSaleCreation = requestSaleContainerCreation;

export async function requestSaleVenueCreation(input: {
  leadId: string;
  saleId: string;
  nombreComercial: string;
  cantidadPos: number;
  direccion: string;
  referencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
  solesAccount: {
    banco: AbonoBank;
    tipoCuenta: AccountTypeKind;
    nroCuenta: string;
    cci?: string;
    isSettlement: boolean;
  };
  dollarAccount?:
    | {
        banco: AbonoBank;
        tipoCuenta: AccountTypeKind;
        nroCuenta: string;
        cci?: string;
        isSettlement: boolean;
      }
    | undefined;
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
  if (!input.referencia.trim()) {
    throw validationError("referencia is required");
  }

  if (!input.solesAccount.nroCuenta.trim()) {
    throw validationError("soles account number is required");
  }

  if (input.dollarAccount && !input.dollarAccount.nroCuenta.trim()) {
    throw validationError("dollar account number is required");
  }

  const settlementCount =
    (input.solesAccount.isSettlement ? 1 : 0) +
    (input.dollarAccount?.isSettlement ? 1 : 0);
  if (settlementCount !== 1) {
    throw validationError("exactly one settlement account must be selected");
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
