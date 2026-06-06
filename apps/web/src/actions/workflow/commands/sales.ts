"use server";

import type {
  SaleVenueAccount,
  VenueDigitalConfig,
} from "~/contracts/workflow/primitives";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export type CreateVenueInput = {
  leadId: string;
  nombreComercial: string;
  posQuantity: number;
  digitalConfig?: VenueDigitalConfig;
  direccion: string;
  referencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
};

export type UpdateVenueInput = CreateVenueInput & {
  venueId: string;
};

export type AddVenueAccountsInput = {
  leadId: string;
  venueId: string;
  solesAccount: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
};

export async function requestVenueCreation(input: CreateVenueInput) {
  return runAction({
    actionName: "workflow.create_venue",
    access: { kind: "auth" },
    input: { leadId: input.leadId },

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.createVenue({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
        nombreComercial: input.nombreComercial,
        posQuantity: input.posQuantity,
        digitalConfig: input.digitalConfig,
        direccion: input.direccion,
        referencia: input.referencia,
        distrito: input.distrito,
        provincia: input.provincia,
        departamento: input.departamento,
      }),
  });
}

export async function requestVenueUpdate(input: UpdateVenueInput) {
  return runAction({
    actionName: "workflow.update_venue",
    access: { kind: "auth" },
    input: { leadId: input.leadId, venueId: input.venueId },

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.updateVenue({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
        venueId: input.venueId,
        nombreComercial: input.nombreComercial,
        posQuantity: input.posQuantity,
        digitalConfig: input.digitalConfig,
        direccion: input.direccion,
        referencia: input.referencia,
        distrito: input.distrito,
        provincia: input.provincia,
        departamento: input.departamento,
      }),
  });
}

export async function requestVenueAccountsAddition(
  input: AddVenueAccountsInput,
) {
  return runAction({
    actionName: "workflow.add_venue_accounts",
    access: { kind: "auth" },
    input: { leadId: input.leadId, venueId: input.venueId },

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.addVenueAccounts({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
        venueId: input.venueId,
        solesAccount: input.solesAccount,
        ...(input.dollarAccount ? { dollarAccount: input.dollarAccount } : {}),
      }),
  });
}
