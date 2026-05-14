import type { SaleVenueAccount, VenueDigitalConfig } from "./primitives";
import type {
  LeadCallOutcome,
  ModalidadCobro,
  Moneda,
  ProductScope,
} from "./vocabulary";

export type LeadListFiltersInput = {
  stage?: string;
  status?: string;
  prioridad?: string;
  executiveId?: number;
  updatedSinceMs?: number;
  updatedUntilMs?: number;
  sortBy?: "createdAt" | "updatedAt" | "registeredBy" | "ruc";
  sortDirection?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export type LeadIdInput = {
  leadId: string;
};

export type LeadArtifactInput = {
  leadId: string;
  artifactId: string;
};

export type AssignableExecutivesInput = {
  leadId: string;
  search?: string;
  limit?: number;
};

export type CreateLeadInput = {
  ruc: string;
  executiveId?: number;
};

export type ReviewLeadInput = {
  leadId: string;
  status: string;
  prioridad: string;
  reason: string;
};

export type SaveCommercialScopeInput = {
  leadId: string;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  giroNegocio: string;
  abonoBank: string;
  posTotal: number;
};

export type SaveDigitalPolicyInput = {
  leadId: string;
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
};

export type RequestQuotationInput = SaveCommercialScopeInput;

export type RecordRepLegalInput = {
  leadId: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
  telefono: string;
  email: string;
};

export type ReassignLeadInput = {
  leadId: string;
  newExecutiveId: number;
};

export type CreateQuotationInput = {
  leadId: string;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: Moneda;
};

export type CreateVenueInput = {
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
  leadId: string;
  venueId: string;
  solesAccount: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
};

export type RequestRateNegotiationInput = {
  leadId: string;
  justification: string;
  artifactIds: string[];
};

export type LogLeadCallInput = {
  leadId: string;
  outcome: LeadCallOutcome;
  notes?: string | null;
};

export type AddLeadNoteInput = {
  leadId: string;
  body: string;
};
