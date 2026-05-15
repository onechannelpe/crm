"use server";

import {
  type AddVenueAccountsInput,
  type CreateVenueInput,
} from "~/contracts/workflow/inputs";
import { validationError } from "~/lib/app-errors";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function requestVenueCreation(input: CreateVenueInput) {
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
      getServerRuntime().workflow.commands.createVenue({
        actor: {
          userId: ctx.actor.userId,
          role: ctx.actor.role,
          branchId: ctx.actor.branchId,
        },
        ...input,
      }),
  });
}

export async function requestVenueAccountsAddition(
  input: AddVenueAccountsInput,
) {
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
      getServerRuntime().workflow.commands.addVenueAccounts({
        actor: {
          userId: ctx.actor.userId,
          role: ctx.actor.role,
          branchId: ctx.actor.branchId,
        },
        ...input,
      }),
  });
}
