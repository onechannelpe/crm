import type { SaleVenueAccount, VenueDigitalConfig } from "./primitives";
import type {
  AbonoBank,
  LeadCallOutcome,
  LeadPriority,
  LeadStage,
  LeadStatus,
  ModalidadCobro,
  Moneda,
  ProductScope,
} from "./vocabulary";

export type ListLeadsFiltersInput = {
  stage?: LeadStage;
  status?: LeadStatus;
  prioridad?: LeadPriority;
  executiveId?: number;
  anyFieldSearch?: string;
  updatedSinceMs?: number;
  updatedUntilMs?: number;
  sortBy?: "createdAt" | "updatedAt" | "registeredBy" | "ruc";
  sortDirection?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export type ListAssignableExecutivesInput = {
  leadId: string;
  search?: string;
  limit?: number;
};

// Command payloads define the client-sendable shape for workflow commands.
// Actions validate unknown request values into these contracts, then add the
// authenticated actor before calling server commands.

export type CreateLeadInput = {
  ruc: string;
  executiveId?: number;
};

export type ReassignLeadInput = {
  leadId: string;
  newExecutiveId: number;
};

export type ReviewLeadInput = {
  leadId: string;
  status: LeadStatus;
  prioridad: LeadPriority;
  reason: string;
};

export type AddLeadNoteInput = {
  leadId: string;
  body: string;
};

export type LogLeadCallInput = {
  leadId: string;
  outcome: LeadCallOutcome;
  notes?: string | null;
};

export type SaveCommercialScopeInput = {
  leadId: string;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  giroNegocio: string;
  abonoBank: AbonoBank;
  posTotal: number;
};

// Requesting a quotation carries the same commercial scope the lead saves, so
// the request reuses that payload rather than restating every field.
export type RequestQuotationInput = SaveCommercialScopeInput;

export type CreateQuotationInput = {
  leadId: string;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: Moneda;
};

export type SaveDigitalPolicyInput = {
  leadId: string;
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
};

export type RecordRepLegalInput = {
  leadId: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
  telefono: string;
  email: string;
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

export type UpdateVenueInput = CreateVenueInput & {
  venueId: string;
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
