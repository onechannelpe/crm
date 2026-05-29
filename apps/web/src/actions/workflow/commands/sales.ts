"use server";

import {
  type AddVenueAccountsInput,
  type CreateVenueInput,
} from "~/contracts/workflow/inputs";
import { validationError } from "~/lib/app-errors";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { parseRequiredLeadText } from "~/server/workflow/parsers";

function assertParsed<T>(
  parsed: { ok: true; value: T } | { ok: false; error: { message: string } },
): T {
  if (!parsed.ok) {
    throw validationError(parsed.error.message);
  }
  return parsed.value;
}

export async function requestVenueCreation(input: CreateVenueInput) {
  const nombreComercial = assertParsed(
    parseRequiredLeadText(
      input.nombreComercial,
      "nombre_comercial_required",
      "Nombre comercial is required",
    ),
  );
  const direccion = assertParsed(
    parseRequiredLeadText(
      input.direccion,
      "direccion_required",
      "Direccion is required",
    ),
  );
  const referencia = assertParsed(
    parseRequiredLeadText(
      input.referencia,
      "referencia_required",
      "Referencia is required",
    ),
  );
  const distrito = assertParsed(
    parseRequiredLeadText(
      input.distrito,
      "distrito_required",
      "Distrito is required",
    ),
  );
  const provincia = assertParsed(
    parseRequiredLeadText(
      input.provincia,
      "provincia_required",
      "Provincia is required",
    ),
  );
  const departamento = assertParsed(
    parseRequiredLeadText(
      input.departamento,
      "departamento_required",
      "Departamento is required",
    ),
  );

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
        nombreComercial,
        posQuantity: input.posQuantity,
        digitalConfig: input.digitalConfig,
        direccion,
        referencia,
        distrito,
        provincia,
        departamento,
      }),
  });
}

export async function requestVenueAccountsAddition(
  input: AddVenueAccountsInput,
) {
  const solesNroCuenta = assertParsed(
    parseRequiredLeadText(
      input.solesAccount.nroCuenta,
      "soles_account_number_required",
      "Soles account number is required",
    ),
  );

  const dollarNroCuenta = input.dollarAccount
    ? assertParsed(
        parseRequiredLeadText(
          input.dollarAccount.nroCuenta,
          "dollar_account_number_required",
          "Dollar account number is required",
        ),
      )
    : null;

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
          nroCuenta: solesNroCuenta,
        },
        ...(input.dollarAccount && dollarNroCuenta
          ? {
              dollarAccount: {
                ...input.dollarAccount,
                nroCuenta: dollarNroCuenta,
              },
            }
          : {}),
      }),
  });
}
