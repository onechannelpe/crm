import type {
  LeadCallOutcome,
  LeadStage,
  LeadStatus,
  Prioridad,
} from "~/lib/db/types";

export type LeadAction =
  | "log-call"
  | "add-note"
  | "complete-commercial-input"
  | "create-sale"
  | "review-lead"
  | "create-quotation"
  | "approve-for-sale"
  | "reassign-lead";

export type LeadDetailData = {
  lead: {
    id: number;
    ruc: string;
    razonSocial: string | null;
    address: string | null;
    executiveId: number;
    stage: LeadStage;
    status: LeadStatus | null;
    prioridad: Prioridad | null;
    createdAt: number;
    updatedAt: number;
  };
  commercialInput:
    | {
        leadId: number;
        proveedorActual: string | null;
        tasaActual: number | null;
        gpv: number | null;
        ticket: number | null;
        abono: number | null;
        cantidadPos: number | null;
        updatedAt: number;
        updatedBy: number;
      }
    | undefined;
  quotations: Array<{
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
  }>;
  sale:
    | {
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
      }
    | undefined;
  timeline: Array<{
    id: string;
    occurredAt: number;
    kind: "call" | "note" | "assignment" | "stage-change" | "system";
    title: string;
    description: string;
    actorDisplayName: string;
  }>;
  availableActions: LeadAction[];
};

export type { LeadCallOutcome };
