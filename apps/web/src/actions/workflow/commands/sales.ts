"use server";

import type {
  AddVenueAccountsInput,
  CreateVenueInput,
  UpdateVenueInput,
} from "~/contracts/workflow/inputs";
import type { SaleVenueAccount } from "~/contracts/workflow/primitives";
import {
  ABONO_BANKS,
  ACCOUNT_TYPE_KINDS,
  MODALIDAD_COBRO_KINDS,
} from "~/contracts/workflow/vocabulary";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime/runtime";
import type { DomainError } from "~/server/shared/domain-error";
import {
  parseObject,
  validationFail,
  type Reader,
} from "~/server/shared/parsing";

import { workflowActor } from "./actor";

function venueFields(r: Reader<DomainError>): CreateVenueInput {
  return {
    leadId: r.str("leadId"),
    nombreComercial: r.str("nombreComercial"),
    posQuantity: r.num("posQuantity"),
    digitalConfig: r.optObj("digitalConfig", (c) => ({
      linkUrl: c.optStr("linkUrl"),
      onlineUrl: c.optStr("onlineUrl"),
      onlineModalidad:
        c.optEnum("onlineModalidad", MODALIDAD_COBRO_KINDS) ?? null,
    })),
    direccion: r.str("direccion"),
    referencia: r.str("referencia"),
    distrito: r.str("distrito"),
    provincia: r.str("provincia"),
    departamento: r.str("departamento"),
  };
}

function accountFields<TCurrency extends "PEN" | "USD">(
  r: Reader<DomainError>,
  currency: TCurrency,
): SaleVenueAccount & { currency: TCurrency } {
  return {
    currency,
    banco: r.enum("banco", ABONO_BANKS),
    tipoCuenta: r.enum("tipoCuenta", ACCOUNT_TYPE_KINDS),
    nroCuenta: r.str("nroCuenta"),
    cci: r.optStr("cci") ?? undefined,
    isSettlement: r.bool("isSettlement"),
  };
}

export async function requestVenueCreation(input: unknown) {
  return runAction({
    name: "workflow.create_venue",
    access: { kind: "auth" },

    parse: () => parseObject(input, validationFail, venueFields),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.createVenue({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}

export async function requestVenueUpdate(input: unknown) {
  return runAction({
    name: "workflow.update_venue",
    access: { kind: "auth" },

    parse: () =>
      parseObject(
        input,
        validationFail,
        (r): UpdateVenueInput => ({
          ...venueFields(r),
          venueId: r.str("venueId"),
        }),
      ),

    audit: ({ leadId, venueId }) => ({ leadId, venueId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.updateVenue({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}

export async function requestVenueAccountsAddition(input: unknown) {
  return runAction({
    name: "workflow.add_venue_accounts",
    access: { kind: "auth" },

    parse: () =>
      parseObject(
        input,
        validationFail,
        (r): AddVenueAccountsInput => ({
          leadId: r.str("leadId"),
          venueId: r.str("venueId"),
          solesAccount: r.obj("solesAccount", (a) => accountFields(a, "PEN")),
          dollarAccount: r.optObj("dollarAccount", (a) =>
            accountFields(a, "USD"),
          ),
        }),
      ),

    audit: ({ leadId, venueId }) => ({ leadId, venueId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.addVenueAccounts({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}
