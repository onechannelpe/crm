"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

import {
  parseAddVenueAccountsInput,
  parseCreateVenueInput,
  parseUpdateVenueInput,
} from "./input";

export async function requestVenueCreation(input: unknown) {
  return runAction({
    actionName: "workflow.create_venue",
    access: { kind: "auth" },
    input,

    execute: async ({ actor }) => {
      const parsedInput = parseCreateVenueInput(input);
      if (!parsedInput.ok) return parsedInput;

      return getServerRuntime().workflow.commands.createVenue({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: parsedInput.value.leadId,
        nombreComercial: parsedInput.value.nombreComercial,
        posQuantity: parsedInput.value.posQuantity,
        digitalConfig: parsedInput.value.digitalConfig,
        direccion: parsedInput.value.direccion,
        referencia: parsedInput.value.referencia,
        distrito: parsedInput.value.distrito,
        provincia: parsedInput.value.provincia,
        departamento: parsedInput.value.departamento,
      });
    },
  });
}

export async function requestVenueUpdate(input: unknown) {
  return runAction({
    actionName: "workflow.update_venue",
    access: { kind: "auth" },
    input,

    execute: async ({ actor }) => {
      const parsedInput = parseUpdateVenueInput(input);
      if (!parsedInput.ok) return parsedInput;

      return getServerRuntime().workflow.commands.updateVenue({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: parsedInput.value.leadId,
        venueId: parsedInput.value.venueId,
        nombreComercial: parsedInput.value.nombreComercial,
        posQuantity: parsedInput.value.posQuantity,
        digitalConfig: parsedInput.value.digitalConfig,
        direccion: parsedInput.value.direccion,
        referencia: parsedInput.value.referencia,
        distrito: parsedInput.value.distrito,
        provincia: parsedInput.value.provincia,
        departamento: parsedInput.value.departamento,
      });
    },
  });
}

export async function requestVenueAccountsAddition(input: unknown) {
  return runAction({
    actionName: "workflow.add_venue_accounts",
    access: { kind: "auth" },
    input,

    execute: async ({ actor }) => {
      const parsedInput = parseAddVenueAccountsInput(input);
      if (!parsedInput.ok) return parsedInput;

      return getServerRuntime().workflow.commands.addVenueAccounts({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: parsedInput.value.leadId,
        venueId: parsedInput.value.venueId,
        solesAccount: parsedInput.value.solesAccount,
        ...(parsedInput.value.dollarAccount
          ? { dollarAccount: parsedInput.value.dollarAccount }
          : {}),
      });
    },
  });
}
