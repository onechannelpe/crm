"use server";

import {
  type AddVenueAccountsInput,
  type CreateVenueInput,
} from "~/contracts/workflow/inputs";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { parseRequiredLeadText } from "~/server/workflow/parsers";

export async function requestVenueCreation(input: CreateVenueInput) {
  const nombreComercial = parseRequiredLeadText(
    input.nombreComercial,
    "nombre_comercial_required",
    "Nombre comercial is required",
  );

  if (!nombreComercial.ok) {
    return nombreComercial;
  }

  const direccion = parseRequiredLeadText(
    input.direccion,
    "direccion_required",
    "Direccion is required",
  );

  if (!direccion.ok) {
    return direccion;
  }

  const referencia = parseRequiredLeadText(
    input.referencia,
    "referencia_required",
    "Referencia is required",
  );

  if (!referencia.ok) {
    return referencia;
  }

  const distrito = parseRequiredLeadText(
    input.distrito,
    "distrito_required",
    "Distrito is required",
  );

  if (!distrito.ok) {
    return distrito;
  }

  const provincia = parseRequiredLeadText(
    input.provincia,
    "provincia_required",
    "Provincia is required",
  );

  if (!provincia.ok) {
    return provincia;
  }

  const departamento = parseRequiredLeadText(
    input.departamento,
    "departamento_required",
    "Departamento is required",
  );

  if (!departamento.ok) {
    return departamento;
  }

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
        nombreComercial: nombreComercial.value,
        posQuantity: input.posQuantity,
        digitalConfig: input.digitalConfig,
        direccion: direccion.value,
        referencia: referencia.value,
        distrito: distrito.value,
        provincia: provincia.value,
        departamento: departamento.value,
      }),
  });
}

export async function requestVenueAccountsAddition(
  input: AddVenueAccountsInput,
) {
  const solesNroCuenta = parseRequiredLeadText(
    input.solesAccount.nroCuenta,
    "soles_account_number_required",
    "Soles account number is required",
  );

  if (!solesNroCuenta.ok) {
    return solesNroCuenta;
  }

  const dollarNroCuenta = input.dollarAccount
    ? parseRequiredLeadText(
        input.dollarAccount.nroCuenta,
        "dollar_account_number_required",
        "Dollar account number is required",
      )
    : null;

  if (dollarNroCuenta && !dollarNroCuenta.ok) {
    return dollarNroCuenta;
  }

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
        solesAccount: {
          ...input.solesAccount,
          nroCuenta: solesNroCuenta.value,
        },
        ...(input.dollarAccount && dollarNroCuenta?.ok
          ? {
              dollarAccount: {
                ...input.dollarAccount,
                nroCuenta: dollarNroCuenta.value,
              },
            }
          : {}),
      }),
  });
}
