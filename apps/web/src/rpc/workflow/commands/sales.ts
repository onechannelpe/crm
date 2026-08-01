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
import type { DomainError } from "~/domain/errors";
import { WorkflowLeadId, WorkflowVenueId } from "~/domain/ids";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
  type Reader,
} from "~/server/platform/action/input-reader";
import { application } from "~/server/platform/composition/application";
import { workflowActor } from "~/server/workflow/ui/actor";

function venueFields(r: Reader<DomainError>): Omit<
  CreateVenueInput,
  "leadId"
> & {
  leadId: WorkflowLeadId;
} {
  return {
    leadId: r.id("leadId", WorkflowLeadId),
    tradeName: r.str("tradeName"),
    posQuantity: r.posInt("posQuantity"),
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
  "use server";

  return executeSessionServerFunction({
    name: "application.workflow.create_venue",
    access: { kind: "auth" },

    parse: () => parseObject(input, validationFail, venueFields),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor, operationAt: now }, payload) =>
      application.workflow.commands.createVenue(
        { actor: workflowActor(actor), ...payload },
        now,
      ),
  });
}

export async function requestVenueUpdate(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "application.workflow.update_venue",
    access: { kind: "auth" },

    parse: () =>
      parseObject(
        input,
        validationFail,
        (
          r,
        ): Omit<UpdateVenueInput, "leadId" | "venueId"> & {
          leadId: WorkflowLeadId;
          venueId: WorkflowVenueId;
        } => ({
          ...venueFields(r),
          venueId: r.id("venueId", WorkflowVenueId),
        }),
      ),

    audit: ({ leadId, venueId }) => ({ leadId, venueId }),

    execute: ({ actor, operationAt: now }, payload) =>
      application.workflow.commands.updateVenue(
        { actor: workflowActor(actor), ...payload },
        now,
      ),
  });
}

export async function requestVenueAccountsAddition(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "application.workflow.add_venue_accounts",
    access: { kind: "auth" },

    parse: () =>
      parseObject(
        input,
        validationFail,
        (
          r,
        ): Omit<AddVenueAccountsInput, "leadId" | "venueId"> & {
          leadId: WorkflowLeadId;
          venueId: WorkflowVenueId;
        } => ({
          leadId: r.id("leadId", WorkflowLeadId),
          venueId: r.id("venueId", WorkflowVenueId),
          solesAccount: r.obj("solesAccount", (a) => accountFields(a, "PEN")),
          dollarAccount: r.optObj("dollarAccount", (a) =>
            accountFields(a, "USD"),
          ),
        }),
      ),

    audit: ({ leadId, venueId }) => ({ leadId, venueId }),

    execute: ({ actor, operationAt: now }, payload) =>
      application.workflow.commands.addVenueAccounts(
        { actor: workflowActor(actor), ...payload },
        now,
      ),
  });
}
