"use server";

import {
  type AddVenueAccountsInput,
  type CreateVenueInput,
} from "~/contracts/workflow/inputs";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { parseRequiredLeadText } from "~/server/workflow/parsers";

export async function requestVenueCreation(input: CreateVenueInput) {
  return runAction({
    actionName: "workflow.create_venue",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: async (ctx) => {
      const nombreComercial = parseRequiredLeadText(
        input.nombreComercial,
        "nombre_comercial_required",
        "Nombre comercial is required",
      );
      if (!nombreComercial.ok) return nombreComercial;
      const direccion = parseRequiredLeadText(
        input.direccion,
        "direccion_required",
        "Direccion is required",
      );
      if (!direccion.ok) return direccion;
      const referencia = parseRequiredLeadText(
        input.referencia,
        "referencia_required",
        "Referencia is required",
      );
      if (!referencia.ok) return referencia;
      const distrito = parseRequiredLeadText(
        input.distrito,
        "distrito_required",
        "Distrito is required",
      );
      if (!distrito.ok) return distrito;
      const provincia = parseRequiredLeadText(
        input.provincia,
        "provincia_required",
        "Provincia is required",
      );
      if (!provincia.ok) return provincia;
      const departamento = parseRequiredLeadText(
        input.departamento,
        "departamento_required",
        "Departamento is required",
      );
      if (!departamento.ok) return departamento;

      return getServerRuntime().workflow.commands.createVenue({
        actor: {
          userId: ctx.actor.userId,
          role: ctx.actor.role,
          branchId: ctx.actor.branchId,
        },
        leadId: input.leadId,
        nombreComercial: nombreComercial.value,
        posQuantity: input.posQuantity,
        digitalConfig: input.digitalConfig,
        direccion: direccion.value,
        referencia: referencia.value,
        distrito: distrito.value,
        provincia: provincia.value,
        departamento: departamento.value,
      });
    },
  });
}

export async function requestVenueAccountsAddition(
  input: AddVenueAccountsInput,
) {
  return runAction({
    actionName: "workflow.add_venue_accounts",
    access: { kind: "auth" },
    input: { leadId: input.leadId, venueId: input.venueId },
    execute: async (ctx) => {
      const solesNroCuenta = parseRequiredLeadText(
        input.solesAccount.nroCuenta,
        "soles_account_number_required",
        "Soles account number is required",
      );
      if (!solesNroCuenta.ok) return solesNroCuenta;

      if (input.dollarAccount) {
        const dollarNroCuenta = parseRequiredLeadText(
          input.dollarAccount.nroCuenta,
          "dollar_account_number_required",
          "Dollar account number is required",
        );
        if (!dollarNroCuenta.ok) return dollarNroCuenta;

        return getServerRuntime().workflow.commands.addVenueAccounts({
          actor: {
            userId: ctx.actor.userId,
            role: ctx.actor.role,
            branchId: ctx.actor.branchId,
          },
          leadId: input.leadId,
          venueId: input.venueId,
          solesAccount: {
            ...input.solesAccount,
            nroCuenta: solesNroCuenta.value,
          },
          dollarAccount: {
            ...input.dollarAccount,
            nroCuenta: dollarNroCuenta.value,
          },
        });
      }

      return getServerRuntime().workflow.commands.addVenueAccounts({
        actor: {
          userId: ctx.actor.userId,
          role: ctx.actor.role,
          branchId: ctx.actor.branchId,
        },
        leadId: input.leadId,
        venueId: input.venueId,
        solesAccount: {
          ...input.solesAccount,
          nroCuenta: solesNroCuenta.value,
        },
      });
    },
  });
}
