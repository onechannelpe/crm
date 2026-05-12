import type { SunatEconomicActivity } from "~/server/client-search/enrichment/sunat/contracts";
import type {
  AbonoBank,
  LeadPriority,
  LeadStage,
  LeadStatus,
  ModalidadCobro,
  Moneda,
  ProductScope,
  SaleVenueAccount,
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

export type LeadDetailProfileView = {
  leadId: string;
  proveedorActual: string | null;
  tasaActual: number | null;
  gpv: number | null;
  ticket: number | null;
  giroNegocio: string | null;
  abonoBank: AbonoBank | null;
  posTotal: number | null;
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
  updatedAt: number;
  updatedBy: number;
};

export type LeadDetailRepLegalView = {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
  telefono: string | null;
  email: string | null;
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

export type LeadDetailVenueView = {
  id: string;
  leadId: string;
  nombreComercial: string;
  posQuantity: number;
  linkUrl: string | null;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
  direccion: string;
  referencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
  solesAccount?: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
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
  profile: LeadDetailProfileView | undefined;
  repLegal: LeadDetailRepLegalView | undefined;
  quotations: LeadDetailQuotationView[];
  venues: LeadDetailVenueView[];
  negotiationRequests: LeadDetailNegotiationRequestView[];
  timeline: LeadTimelineItem[];
  availableActions: LeadAvailableAction[];
  blockingFields: LeadBlockingField[];
  sourceStatus: LeadDetailSourceStatusView;
};
