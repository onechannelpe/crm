import type { SunatEconomicActivity } from "~/server/client-search/enrichment/sunat/contracts";
import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
  Moneda,
} from "~/workflow/contracts/lead-schema";

import type { LeadBlockingField } from "../../../domain/lead-progress";
import type { LeadAvailableAction } from "../../contracts/lead-available-action";
import type { SunatSourceStatus } from "../../ports/source-status-repository";

export type LeadTimelineItem = {
  id: string;
  occurredAt: number;
  kind: "call" | "note" | "assignment" | "stage-change" | "system";
  title: string;
  description: string;
  actorDisplayName: string;
};

export type LeadDetailLeadView = {
  id: string;
  ruc: string;
  isFavorite: boolean;
  razonSocial: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  executiveId: number;
  executiveName: string;
  createdBy: number;
  createdByName: string;
  updatedBy: number | null;
  updatedByName: string | null;
  stage: LeadStage;
  status: LeadStatus | null;
  prioridad: LeadPriority | null;
  nextStep: string;
  createdAt: number;
  updatedAt: number;
};

export type LeadDetailCommercialInputView = {
  leadId: string;
  proveedorActual: string | null;
  tasaActual: number | null;
  gpv: number | null;
  ticket: number | null;
  abono: number | null;
  cantidadPos: number | null;
  updatedAt: number;
  updatedBy: number;
};

export type LeadDetailQuotationView = {
  id: string;
  leadId: string;
  version: number;
  moneda: Moneda;
  fee: number;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  createdAt: number;
  createdBy: number;
};

export type LeadDetailSaleView = {
  id: string;
  leadId: string;
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

export type LeadDetailSourceStatusView = {
  sunat: {
    status: SunatSourceStatus;
    fetchedAt: number | null;
    district: string | null;
    department: string | null;
    contributorStatus: string | null;
    contributorCondition: string | null;
    economicActivities: SunatEconomicActivity[];
    payloadAvailable: boolean;
  };
};

export type LeadDetailView = {
  lead: LeadDetailLeadView;
  commercialInput: LeadDetailCommercialInputView | undefined;
  quotations: LeadDetailQuotationView[];
  sale: LeadDetailSaleView | undefined;
  timeline: LeadTimelineItem[];
  availableActions: LeadAvailableAction[];
  blockingFields: LeadBlockingField[];
  sourceStatus: LeadDetailSourceStatusView;
};
