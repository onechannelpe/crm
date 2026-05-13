"use server";

import { validationError } from "~/lib/app-errors";
import { runAction } from "~/server/shared/action-runtime";
import { runWorkflowCommand } from "~/server/workflow/infrastructure/command-runtime";
import type {
  AbonoBank,
  AccountTypeKind,
  VenueDigitalConfig,
} from "~/workflow/contracts/lead-schema";

export async function requestVenueCreation(input: {
  leadId: string;
  nombreComercial: string;
  posQuantity: number;
  digitalConfig?: VenueDigitalConfig;
  direccion: string;
  referencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
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

  return runAction({
    actionName: "workflow.create_venue",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: (ctx) =>
      runWorkflowCommand(({ useCases }) =>
        useCases.createVenue({
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

export async function requestVenueAccountsAddition(input: {
  leadId: string;
  venueId: string;
  solesAccount: {
    currency: "PEN";
    banco: AbonoBank;
    tipoCuenta: AccountTypeKind;
    nroCuenta: string;
    cci?: string;
    isSettlement: boolean;
  };
  dollarAccount?:
    | {
        currency: "USD";
        banco: AbonoBank;
        tipoCuenta: AccountTypeKind;
        nroCuenta: string;
        cci?: string;
        isSettlement: boolean;
      }
    | undefined;
}) {
  if (!input.solesAccount.nroCuenta.trim()) {
    throw validationError("soles account number is required");
  }
  if (input.dollarAccount && !input.dollarAccount.nroCuenta.trim()) {
    throw validationError("dollar account number is required");
  }

  return runAction({
    actionName: "workflow.add_venue_accounts",
    access: { kind: "auth" },
    input: { leadId: input.leadId, venueId: input.venueId },
    execute: (ctx) =>
      runWorkflowCommand(({ useCases }) =>
        useCases.addVenueAccounts({
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
