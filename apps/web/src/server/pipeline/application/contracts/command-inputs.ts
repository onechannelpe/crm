import type {
  LeadCallOutcome,
  LeadPriority,
  LeadStatus,
  Moneda,
} from "~/pipeline/contracts/lead-schema";

import type { ActorContext } from "./actor-context";

export type ReassignLeadInput = {
  actor: ActorContext;
  leadId: number;
  toExecutiveId: number;
};

export type ReviewLeadInput = {
  actor: ActorContext;
  leadId: number;
  status: LeadStatus;
  prioridad: LeadPriority;
  reason: string;
};

export type AddLeadNoteInput = {
  actor: ActorContext;
  leadId: number;
  body: string;
};

export type LogLeadCallInput = {
  actor: ActorContext;
  leadId: number;
  outcome: LeadCallOutcome;
  notes?: string | null;
};

export type ApplyImportedReviewInput = {
  actor: ActorContext;
  leadId: number;
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
  leadId: number;
};

export type CreateQuotationInput = {
  actor: ActorContext;
  leadId: number;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: Moneda;
};

export type CompleteCommercialInputInput = {
  actor: ActorContext;
  leadId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
};

export type CreateSaleInput = {
  actor: ActorContext;
  leadId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
  banco: string;
  nroCuenta: string;
  cci: string | null;
};
