import type { FieldChange } from "../events";
import type { SaleVenueAccount } from "./primitives";
import type {
  AbonoBank,
  LeadNextStep,
  LeadPriority,
  LeadStage,
  LeadStatus,
  ModalidadCobro,
  Moneda,
  ProductScope,
} from "./vocabulary";

export type LeadAvailableAction =
  | "log-call"
  | "add-note"
  | "propose-rate"
  | "edit-rate-proposal"
  | "accept-rate"
  | "request-rate-revision"
  | "update-venue"
  | "reassign-lead";

export type LeadBlockingField =
  | "proveedorActual"
  | "tasaDebitoActual"
  | "tasaCreditoActual"
  | "gpv"
  | "ticket"
  | "giroNegocio"
  | "abonoBank"
  | "posTotal"
  | "digitalPolicy"
  | "venueAccounts";

export type AssignableExecutiveView = {
  id: number;
  fullName: string;
};

export type LeadBootstrapPreviewView = {
  razonSocial: string | null;
  address: string | null;
  engineStatus: "available" | "missing" | "failed";
};

export type LeadListRowView = {
  id: string;
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
  executiveName: string;
  createdBy: number;
  createdByName: string;
  stage: LeadStage;
  status: LeadStatus | null;
  prioridad: LeadPriority | null;
  nextStep: LeadNextStep;
  createdAt: number;
  updatedAt: number;
};

export type LeadListView = {
  rows: LeadListRowView[];
  totalCount: number;
};

export type LeadTimelineItem = {
  id: string;
  occurredAt: number;
  kind: "call" | "note" | "assignment" | "stage-change" | "system";
  title: string;
  description: string;
  actorDisplayName: string;
  // Field-level diff for correction events, so the feed can show what moved.
  changes?: FieldChange[];
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
  nextStep: LeadNextStep;
  createdAt: number;
  updatedAt: number;
  reservationExpiresAt: number | null;
};

export type LeadDetailRateProposalView = {
  id: string;
  leadId: string;
  round: number;
  moneda: Moneda;
  fee: number;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  outcome: "pending" | "accepted" | "revision_requested";
  proposedBy: number;
  proposedAt: number;
  decidedAt: number | null;
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

export type LeadDetailRateRevisionView = {
  id: string;
  proposalId: string;
  round: number;
  justification: string;
  requestedBy: number;
  requestedAt: number;
  files: LeadDetailRateRevisionFileView[];
};

export type LeadDetailView = {
  lead: LeadDetailLeadView;
  profile: LeadDetailProfileView | undefined;
  repLegal: LeadDetailRepLegalView | undefined;
  rateProposals: LeadDetailRateProposalView[];
  venues: LeadDetailVenueView[];
  rateRevisions: LeadDetailRateRevisionView[];
  timeline: LeadTimelineItem[];
  availableActions: LeadAvailableAction[];
  blockingFields: LeadBlockingField[];
  sourceStatus: LeadDetailSourceStatusView;
};

type LeadDetailProfileView = {
  leadId: string;
  proveedorActual: string | null;
  tasaDebitoActual: number | null;
  tasaCreditoActual: number | null;
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

type LeadDetailRepLegalView = {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
  telefono: string | null;
  email: string | null;
};

type LeadDetailSourceStatusView = {
  sunat: {
    status: "idle" | "queued" | "running" | "completed" | "failed" | "stale";
    fetchedAt: number | null;
    district: string | null;
    department: string | null;
    contributorStatus: string | null;
    contributorCondition: string | null;
    economicActivities: Array<{
      role: "principal" | "secondary";
      order: number | null;
      label: string;
      code: string;
      description: string;
    }>;
    payloadAvailable: boolean;
  };
};

type LeadDetailRateRevisionFileView = {
  artifactId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
};
