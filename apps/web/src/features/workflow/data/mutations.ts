import { action, json } from "@solidjs/router";

import type {
  AbonoBank,
  AccountTypeKind,
  ModalidadCobro,
  Moneda,
  ProductScope,
  VenueDigitalConfig,
} from "~/contracts/workflow";
import { requestRateNegotiation } from "~/features/workflow/api/mutations";
import {
  requestQuotationCreation,
  requestSaleApproval,
} from "~/features/workflow/api/mutations";
import {
  requestAddLeadToFavorites,
  requestLeadCreation,
  requestLeadReassignment,
  requestLeadReview,
  requestQuotation,
  requestRecordRepLegal,
  requestRemoveLeadFromFavorites,
  requestSaveCommercialScope,
} from "~/features/workflow/api/mutations";
import {
  requestVenueAccountsAddition,
  requestVenueCreation,
} from "~/features/workflow/api/mutations";

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

export const saveCommercialScopeMutation = action(
  async (input: {
    leadId: string;
    proveedorActual: string;
    tasaActual: number;
    gpv: number;
    ticket: number;
    giroNegocio: string;
    abonoBank: AbonoBank;
    posTotal: number;
    linkScope: ProductScope;
    linkUrl: string | null;
    onlineScope: ProductScope;
    onlineUrl: string | null;
    onlineModalidad: ModalidadCobro | null;
  }) => {
    await requestSaveCommercialScope(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.saveCommercialScope",
);

export const requestQuotationMutation = action(
  async (input: { leadId: string }) => {
    await requestQuotation(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.requestQuotation",
);

export const recordRepLegalMutation = action(
  async (input: {
    leadId: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    dni: string;
    telefono: string;
    email: string;
  }) => {
    await requestRecordRepLegal(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.recordRepLegal",
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
