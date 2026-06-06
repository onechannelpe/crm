import type { SaleVenueAccount } from "~/contracts/workflow/primitives";
import type {
  AbonoBank,
  LeadCallOutcome,
  ModalidadCobro,
  Moneda,
  ProductScope,
} from "~/contracts/workflow/vocabulary";

import type { WorkflowActor } from "./actor";

export type RegisterLeadCommandInput = {
  actor: WorkflowActor;
  ruc: string;
  executiveId: number;
};

export type ReassignLeadCommandInput = {
  actor: WorkflowActor;
  leadId: string;
  toExecutiveId: number;
};

// Raw wire values. reviewLeadCommand narrows status/prioridad to their
// vocabulary types and owns validation, so every caller is checked once.
export type ReviewLeadCommandInput = {
  actor: WorkflowActor;
  leadId: string;
  status: string;
  prioridad: string;
  reason: string;
};

export type AddLeadNoteCommandInput = {
  actor: WorkflowActor;
  leadId: string;
  body: string;
};

export type LogLeadCallCommandInput = {
  actor: WorkflowActor;
  leadId: string;
  outcome: LeadCallOutcome;
  notes?: string | null;
};

export type CreateQuotationCommandInput = {
  actor: WorkflowActor;
  leadId: string;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: Moneda;
};

export type SaveCommercialScopeCommandInput = {
  actor: WorkflowActor;
  leadId: string;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  giroNegocio: string;
  abonoBank: AbonoBank;
  posTotal: number;
};

export type SaveDigitalPolicyCommandInput = {
  actor: WorkflowActor;
  leadId: string;
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
};

export type RequestQuotationCommandInput = {
  actor: WorkflowActor;
  leadId: string;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  giroNegocio: string;
  abonoBank: AbonoBank;
  posTotal: number;
};

export type RecordRepLegalCommandInput = {
  actor: WorkflowActor;
  leadId: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
  telefono: string;
  email: string;
};

export type RequestRateNegotiationCommandInput = {
  actor: WorkflowActor;
  leadId: string;
  justification: string;
  artifactIds: string[];
};

export type CreateVenueCommandInput = {
  actor: WorkflowActor;
  leadId: string;
  nombreComercial: string;
  posQuantity: number;
  digitalConfig?: {
    linkUrl?: string | null;
    onlineUrl?: string | null;
    onlineModalidad?: ModalidadCobro | null;
  };
  direccion: string;
  referencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
};

export type UpdateVenueCommandInput = CreateVenueCommandInput & {
  venueId: string;
};

export type AddVenueAccountsCommandInput = {
  actor: WorkflowActor;
  leadId: string;
  venueId: string;
  solesAccount: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
};

export type UpdateSourcingPolicyCommandInput = {
  actor: WorkflowActor;
  branchId: number;
  engineAssignmentEnabled: boolean;
};
