import type { Lead } from "../domain/lead";

export type LeadAction =
  | "log-call"
  | "add-note"
  | "complete-commercial-input"
  | "create-sale"
  | "review-lead"
  | "create-quotation"
  | "approve-for-sale"
  | "reassign-lead";

export type TimelineItem = {
  id: string;
  occurredAt: number;
  kind: "call" | "note" | "assignment" | "stage-change" | "system";
  title: string;
  description: string;
  actorDisplayName: string;
};

export type LeadDetailLead = {
  id: number;
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
  stage: Lead["stage"];
  status: Lead["status"];
  prioridad: Lead["prioridad"];
  createdAt: number;
  updatedAt: number;
};

export type LeadDetailCommercialInput = {
  leadId: number;
  proveedorActual: string | null;
  tasaActual: number | null;
  gpv: number | null;
  ticket: number | null;
  abono: number | null;
  cantidadPos: number | null;
  updatedAt: number;
  updatedBy: number;
};

export type LeadDetailQuotation = {
  id: number;
  leadId: number;
  version: number;
  moneda: "PEN" | "USD";
  fee: number;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  createdAt: number;
  createdBy: number;
};

export type LeadDetailSale = {
  id: number;
  leadId: number;
  executiveId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
  banco: string;
  nroCuenta: string;
  cci: string | null;
  createdAt: number;
};

export type LeadDetailOutput = {
  lead: LeadDetailLead;
  commercialInput: LeadDetailCommercialInput | undefined;
  quotations: LeadDetailQuotation[];
  sale: LeadDetailSale | undefined;
  timeline: TimelineItem[];
  availableActions: LeadAction[];
};
