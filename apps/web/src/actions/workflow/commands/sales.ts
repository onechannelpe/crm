"use server";

import type {
  AddVenueAccountsInput,
  CreateVenueInput,
  UpdateVenueInput,
} from "~/contracts/workflow/inputs";
import type { SaleVenueAccount } from "~/contracts/workflow/primitives";
import {
  SETTLEMENT_BANKS,
  ACCOUNT_TYPE_KINDS,
  COLLECTION_MODES,
} from "~/contracts/workflow/vocabulary";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import type { DomainError } from "~/server/shared/domain-error";
import {
  parseObject,
  validationFail,
  type Reader,
} from "~/server/shared/parsing";
import { addVenueAccountsCommand } from "~/server/workflow/lead/venue/add-venue-accounts";
import { createVenueCommand } from "~/server/workflow/lead/venue/create-venue";
import { updateVenueCommand } from "~/server/workflow/lead/venue/update-venue";

import { workflowActor } from "./actor";

function venueFields(r: Reader<DomainError>): CreateVenueInput {
  return {
    leadId: r.str("leadId"),
    tradeName: r.str("tradeName"),
    posQuantity: r.num("posQuantity"),
    digitalConfig: r.optObj("digitalConfig", (c) => ({
      linkUrl: c.optStr("linkUrl"),
      onlineUrl: c.optStr("onlineUrl"),
      onlineCollectionMode:
        c.optEnum("onlineCollectionMode", COLLECTION_MODES) ?? null,
    })),
    address: r.str("address"),
    addressReference: r.str("addressReference"),
    district: r.str("district"),
    province: r.str("province"),
    department: r.str("department"),
  };
}

function accountFields<TCurrency extends "PEN" | "USD">(
  r: Reader<DomainError>,
  currency: TCurrency,
): SaleVenueAccount & { currency: TCurrency } {
  return {
    currency,
    banco: r.enum("banco", SETTLEMENT_BANKS),
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
      createVenueCommand(
        { actor: workflowActor(actor), ...payload },
        {
          executor: getServerRuntime().workflow.db,
          now: getServerRuntime().workflow.now(),
        },
      ),
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
      updateVenueCommand(
        { actor: workflowActor(actor), ...payload },
        {
          executor: getServerRuntime().workflow.db,
          now: getServerRuntime().workflow.now(),
        },
      ),
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
      addVenueAccountsCommand(
        { actor: workflowActor(actor), ...payload },
        {
          executor: getServerRuntime().workflow.db,
          now: getServerRuntime().workflow.now(),
        },
      ),
  });
}
