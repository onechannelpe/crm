import type {
  LeadCallOutcome,
  LeadPriority,
  LeadStatus,
  Moneda,
  AbonoBank,
  CulqiProductKind,
  ModalidadCobro,
  AccountTypeKind,
} from "~/workflow/contracts/lead-schema";

import type { ActorContext } from "./actor-context";

export type ReassignLeadInput = {
  actor: ActorContext;
  leadId: string;
  toExecutiveId: number;
};

export type AddLeadToFavoritesInput = {
  actor: ActorContext;
  leadId: string;
};

export type RemoveLeadFromFavoritesInput = {
  actor: ActorContext;
  leadId: string;
};

export type ReviewLeadInput = {
  actor: ActorContext;
  leadId: string;
  status: LeadStatus;
  prioridad: LeadPriority;
  reason: string;
};

export type AddLeadNoteInput = {
  actor: ActorContext;
  leadId: string;
  body: string;
};

export type LogLeadCallInput = {
  actor: ActorContext;
  leadId: string;
  outcome: LeadCallOutcome;
  notes?: string | null;
};

export type ApplyImportedReviewInput = {
  actor: ActorContext;
  leadId: string;
  type: "import_status" | "import_prioridad";
  status?: LeadStatus;
  prioridad?: LeadPriority;
  expectedUpdatedAt: number;
};

export type RegisterLeadInput = {
  actor: ActorContext;
  ruc: string;
  executiveId: number;
};

export type ApproveForSaleInput = {
  actor: ActorContext;
  leadId: string;
};

export type CreateQuotationInput = {
  actor: ActorContext;
  leadId: string;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: Moneda;
};

export type CompleteCommercialInputInput = {
  actor: ActorContext;
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
};

export type RequestRateNegotiationInput = {
  actor: ActorContext;
  leadId: string;
  justification: string;
  artifactIds: string[];
};

export type CreateSaleInput = {
  actor: ActorContext;
  leadId: string;
};

export type CreateSaleVenueInput = {
  actor: ActorContext;
  leadId: string;
  saleId: string;
  nombreComercial: string;
  cantidadPos: number;
  direccion: string;
  referencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
  solesAccount: {
    banco: AbonoBank;
    tipoCuenta: AccountTypeKind;
    nroCuenta: string;
    cci?: string;
    isSettlement: boolean;
  };
  dollarAccount?: {
    banco: AbonoBank;
    tipoCuenta: AccountTypeKind;
    nroCuenta: string;
    cci?: string;
    isSettlement: boolean;
  };
};
