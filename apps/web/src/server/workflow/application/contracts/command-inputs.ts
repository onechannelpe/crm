import type {
  AbonoBank,
  LeadCallOutcome,
  LeadPriority,
  LeadStatus,
  ModalidadCobro,
  Moneda,
  ProductScope,
  SaleVenueAccount,
  VenueDigitalConfig,
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

export type SaveCommercialScopeInput = {
  actor: ActorContext;
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
};

export type RequestQuotationInput = {
  actor: ActorContext;
  leadId: string;
};

export type RecordRepLegalInput = {
  actor: ActorContext;
  leadId: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
  telefono: string;
  email: string;
};

export type RequestRateNegotiationInput = {
  actor: ActorContext;
  leadId: string;
  justification: string;
  artifactIds: string[];
};

export type CreateVenueInput = {
  actor: ActorContext;
  leadId: string;
  nombreComercial: string;
  posQuantity: number;
  digitalConfig?: VenueDigitalConfig;
  direccion: string;
  referencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
};

export type AddVenueAccountsInput = {
  actor: ActorContext;
  leadId: string;
  venueId: string;
  solesAccount: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
};

export type RequestSunatRefreshInput = {
  actor: ActorContext;
  leadId: string;
};

export type UpdateSourcingPolicyInput = {
  actor: ActorContext;
  branchId: number;
  engineAssignmentEnabled: boolean;
};
