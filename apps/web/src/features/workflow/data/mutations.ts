import { action, json } from "@solidjs/router";

import { requestRateNegotiation } from "~/actions/workflow/commands/negotiation";
import {
  requestQuotationCreation,
  requestSaleApproval,
} from "~/actions/workflow/commands/quotations";
import {
  requestAddLeadToFavorites,
  requestLeadCommercialInputCompletion,
  requestLeadCreation,
  requestLeadReassignment,
  requestLeadReview,
  requestRemoveLeadFromFavorites,
} from "~/actions/workflow/commands/records";
import {
  requestSaleCreation,
  requestSaleVenueCreation,
} from "~/actions/workflow/commands/sales";
import type {
  Moneda,
  AbonoBank,
  AccountTypeKind,
  CulqiProductKind,
  ModalidadCobro,
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

export const completeCommercialInputMutation = action(
  async (input: {
    leadId: string;
    proveedorActual: string;
    tasaActual: number;
    gpv: number;
    ticket: number;
    giroNegocio: string;
    tipoProducto: CulqiProductKind;
    urlCliente: string | null;
    modalidadCobro: ModalidadCobro | null;
    repLegalNombres: string;
    repLegalApellidoPaterno: string;
    repLegalApellidoMaterno: string;
    repLegalDni: string;
    repLegalTelefono: string;
    repLegalEmail: string;
  }) => {
    await requestLeadCommercialInputCompletion(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.completeCommercialInput",
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

export const createSaleMutation = action(async (input: { leadId: string }) => {
  const result = await requestSaleCreation(input);
  return json(result, {
    revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key],
  });
}, "workflow.createSale");

export const createSaleVenueMutation = action(
  async (input: {
    leadId: string;
    saleId: string;
    nombreComercial: string;
    cantidadPos: number;
    direccion: string;
    referencia: string | null;
    distrito: string;
    provincia: string;
    departamento: string;
    solesAccount: {
      banco: AbonoBank;
      tipoCuenta: AccountTypeKind;
      nroCuenta: string;
      cci?: string;
    };
    dollarAccount?:
      | {
          banco: AbonoBank;
          tipoCuenta: AccountTypeKind;
          nroCuenta: string;
          cci?: string;
        }
      | undefined;
    abono: AbonoBank;
  }) => {
    await requestSaleVenueCreation(input);
    return json(
      {},
      { revalidate: [leadDetailQuery.keyFor(input.leadId), leadListQuery.key] },
    );
  },
  "workflow.createSaleVenue",
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
