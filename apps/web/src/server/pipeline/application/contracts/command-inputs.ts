import type {
  LeadCallOutcome,
  LeadPriority,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";
import type { LeadId } from "~/server/pipeline/domain/lead-record";

import type { ActorContext } from "./actor-context";

export type ReassignLeadInput = {
  actor: ActorContext;
  leadId: LeadId;
  toExecutiveId: number;
};

export type ReviewLeadInput = {
  actor: ActorContext;
  leadId: LeadId;
  status: LeadStatus;
  prioridad: LeadPriority;
  reason: string;
};

export type AddLeadNoteInput = {
  actor: ActorContext;
  leadId: LeadId;
  body: string;
};

export type LogLeadCallInput = {
  actor: ActorContext;
  leadId: LeadId;
  outcome: LeadCallOutcome;
  notes?: string | null;
};

export type ApplyImportedReviewInput = {
  actor: ActorContext;
  leadId: LeadId;
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
  leadId: LeadId;
};

export type CreateQuotationInput = {
  actor: ActorContext;
  leadId: LeadId;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: "PEN" | "USD";
};

export type CompleteCommercialInputInput = {
  actor: ActorContext;
  leadId: LeadId;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
};

export type CreateSaleInput = {
  actor: ActorContext;
  leadId: LeadId;
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
