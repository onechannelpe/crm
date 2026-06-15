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

export type CommercialScope = {
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  giroNegocio: string;
  abonoBank: AbonoBank;
  posTotal: number;
};

export type CreateLeadInput = {
  ruc: string;
  razonSocial: string;
  address: string;
} & CommercialScope;

export type EditCommercialScopeInput = { leadId: string } & CommercialScope;

export type ReassignLeadInput = {
  leadId: string;
  newExecutiveId: number;
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

export type ProposeRateInput = {
  leadId: string;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  paybackPricing: number;
  moneda: Moneda;
};

export type AcceptRateInput = {
  leadId: string;
  proposalId: string;
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

export type RequestRateRevisionInput = {
  leadId: string;
  justification: string;
  artifactIds: string[];
};
