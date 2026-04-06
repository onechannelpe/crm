export type PipelineLeadStage =
  | "PENDING_EXTERNAL_REVIEW"
  | "REJECTED_BY_STATUS"
  | "NEEDS_EXECUTIVE_INPUT"
  | "READY_FOR_QUOTATION"
  | "QUOTED"
  | "READY_FOR_SALE"
  | "CONVERTED";

export type PipelineLeadStatus =
  | "DISPONIBLE"
  | "SIN RESULTADO"
  | "CARTERIZADO"
  | "STOCK";

export type PipelineLeadPriority = "P1" | "P2" | "SIN RESULTADO";

export type PipelineLeadAction =
  | "log-call"
  | "add-note"
  | "complete-commercial-input"
  | "create-sale"
  | "review-lead"
  | "create-quotation"
  | "approve-for-sale"
  | "reassign-lead";

export type PipelineTimelineItem = {
  id: string;
  occurredAt: number;
  kind: "call" | "note" | "assignment" | "stage-change" | "system";
  title: string;
  description: string;
  actorDisplayName: string;
};

export type PipelineLeadDetailLead = {
  id: number;
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
  stage: PipelineLeadStage;
  status: PipelineLeadStatus | null;
  prioridad: PipelineLeadPriority | null;
  createdAt: number;
  updatedAt: number;
};

export type PipelineLeadDetailCommercialInput = {
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

export type PipelineLeadDetailQuotation = {
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

export type PipelineLeadDetailSale = {
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

export type PipelineLeadDetail = {
  lead: PipelineLeadDetailLead;
  commercialInput: PipelineLeadDetailCommercialInput | undefined;
  quotations: PipelineLeadDetailQuotation[];
  sale: PipelineLeadDetailSale | undefined;
  timeline: PipelineTimelineItem[];
  availableActions: PipelineLeadAction[];
};
