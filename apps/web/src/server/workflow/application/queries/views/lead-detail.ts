import type { SunatEconomicActivity } from "~/server/client-search/enrichment/sunat/contracts";
import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
  Moneda,
  AbonoBank,
  CulqiProductKind,
  ModalidadCobro,
  AccountTypeKind,
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
  giroNegocio: string | null;
  tipoProducto: CulqiProductKind | null;
  urlCliente: string | null;
  modalidadCobro: ModalidadCobro | null;
  repLegalNombres: string | null;
  repLegalApellidoPaterno: string | null;
  repLegalApellidoMaterno: string | null;
  repLegalDni: string | null;
  repLegalTelefono: string | null;
  repLegalEmail: string | null;
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
  createdAt: number;
};

export type LeadDetailSaleVenueView = {
  id: string;
  saleId: string;
  leadId: string;
  nombreComercial: string;
  cantidadPos: number;
  direccion: string;
  referencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
  solesAccount: {
    banco: AbonoBank;
    tipoCuenta: AccountTypeKind;
    nroCuenta: string;
    cci?: string;
    isSettlement: boolean;
  };
  dollarAccount?: {
    banco: AbonoBank;
    tipoCuenta: AccountTypeKind;
    nroCuenta: string;
    cci?: string;
    isSettlement: boolean;
  };
  createdAt: number;
  createdBy: number;
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

export type LeadDetailNegotiationFileView = {
  artifactId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
};

export type LeadDetailNegotiationRequestView = {
  id: string;
  round: number;
  justification: string;
  requestedBy: number;
  requestedAt: number;
  files: LeadDetailNegotiationFileView[];
};

export type LeadDetailView = {
  lead: LeadDetailLeadView;
  commercialInput: LeadDetailCommercialInputView | undefined;
  quotations: LeadDetailQuotationView[];
  sale: LeadDetailSaleView | undefined;
  venues: LeadDetailSaleVenueView[];
  negotiationRequests: LeadDetailNegotiationRequestView[];
  timeline: LeadTimelineItem[];
  availableActions: LeadAvailableAction[];
  blockingFields: LeadBlockingField[];
  sourceStatus: LeadDetailSourceStatusView;
};
