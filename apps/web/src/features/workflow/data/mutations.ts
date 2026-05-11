import { action, json } from "@solidjs/router";

import { requestRateNegotiation } from "~/actions/workflow/commands/negotiation";
import {
  requestQuotationCreation,
  requestSaleApproval,
} from "~/actions/workflow/commands/quotations";
import {
  requestAddLeadToFavorites,
  requestLeadCreation,
  requestLeadReassignment,
  requestLeadReview,
  requestRemoveLeadFromFavorites,
  requestScopingCompletion,
} from "~/actions/workflow/commands/records";
import {
  requestVenueAccountsAddition,
  requestVenueCreation,
} from "~/actions/workflow/commands/sales";
import type {
  AbonoBank,
  AccountTypeKind,
  ModalidadCobro,
  Moneda,
  ProductScope,
  VenueDigitalConfig,
} from "~/workflow/contracts/lead-schema";

import { leadDetailQuery, leadListQuery } from "./queries";

type CreateLeadInput = {
  ruc: string;
  executiveId?: number;
};

export const createLeadMutation = action(async (input: CreateLeadInput) => {
  const result = await requestLeadCreation(input);
  return json(result, { revalidate: leadListQuery.key });
}, "workflow.createLead");

export const approveForSaleMutation = action(
  async (input: { leadId: string }) => {
    await requestSaleApproval(input.leadId);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.approveForSale",
);

export const reviewLeadMutation = action(
  async (input: {
    leadId: string;
    status: string;
    prioridad: string;
    reason: string;
  }) => {
    await requestLeadReview(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.reviewLead",
);

export const completeScopingMutation = action(
  async (input: {
    leadId: string;
    proveedorActual: string;
    tasaActual: number;
    gpv: number;
    ticket: number;
    giroNegocio: string;
    linkScope: ProductScope;
    linkUrl: string | null;
    onlineScope: ProductScope;
    onlineUrl: string | null;
    onlineModalidad: ModalidadCobro | null;
    repLegalNombres: string;
    repLegalApellidoPaterno: string;
    repLegalApellidoMaterno: string;
    repLegalDni: string;
    repLegalTelefono: string;
    repLegalEmail: string;
  }) => {
    await requestScopingCompletion(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.completeScoping",
);

export const createQuotationMutation = action(
  async (input: {
    leadId: string;
    paybackPricing: number;
    tarifaDebito: number;
    tarifaCredito: number;
    tarifaForaneo: number;
    fee: number;
    moneda: Moneda;
  }) => {
    await requestQuotationCreation(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.createQuotation",
);

export const createVenueMutation = action(
  async (input: {
    leadId: string;
    nombreComercial: string;
    posQuantity: number;
    digitalConfig?: VenueDigitalConfig;
    direccion: string;
    referencia: string;
    distrito: string;
    provincia: string;
    departamento: string;
  }) => {
    await requestVenueCreation(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.createVenue",
);

export const addVenueAccountsMutation = action(
  async (input: {
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
  }) => {
    await requestVenueAccountsAddition(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.addVenueAccounts",
);

export const requestRateNegotiationMutation = action(
  async (input: {
    leadId: string;
    justification: string;
    artifactIds: string[];
  }) => {
    const result = await requestRateNegotiation(input);
    if (!result.ok) {
      throw result.error;
    }
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.requestRateNegotiation",
);

export const reassignLeadMutation = action(
  async (input: { leadId: string; newExecutiveId: number }) => {
    await requestLeadReassignment(input);
    return json(
      {},
      {
        revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key],
      },
    );
  },
  "workflow.reassignLead",
);

export const addLeadToFavoritesMutation = action(
  async (input: { leadId: string }) => {
    await requestAddLeadToFavorites(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.addLeadToFavorites",
);

export const removeLeadFromFavoritesMutation = action(
  async (input: { leadId: string }) => {
    await requestRemoveLeadFromFavorites(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.removeLeadFromFavorites",
);
