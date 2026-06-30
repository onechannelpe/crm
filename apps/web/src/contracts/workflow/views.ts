import type { FieldChange } from "../events";
import type { SaleVenueAccount } from "./primitives";
import type {
  SettlementBank,
  LeadNextStep,
  LeadPriority,
  LeadStage,
  LeadStatus,
  CollectionMode,
  Currency,
  ProductScope,
  ProductKind,
  FulfillmentStep,
  FulfillmentAction,
  FulfillmentDocKind,
} from "./vocabulary";

export type LeadAvailableAction =
  | "add-note"
  | "propose-rate"
  | "edit-rate-proposal"
  | "accept-rate"
  | "request-rate-revision"
  | "close-lead"
  | "update-venue"
  | "reassign-lead"
  | `fulfillment:${FulfillmentAction}`
  | "fulfillment-reject";

export type LeadBlockingField = "digitalPolicy" | "venueAccounts";

export type AssignableExecutiveView = {
  id: string;
  fullName: string;
};

export type LeadBootstrapPreviewView = {
  legalName: string | null;
  address: string | null;
  engineStatus: "available" | "missing" | "failed";
};

export type LeadListRowView = {
  id: string;
  ruc: string;
  legalName: string | null;
  address: string | null;
  executiveId: string;
  executiveName: string;
  createdBy: string;
  createdByName: string;
  stage: LeadStage;
  status: LeadStatus | null;
  priority: LeadPriority | null;
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
  kind: "note" | "assignment" | "stage-change" | "system";
  title: string;
  description: string;
  actorDisplayName: string;
  changes?: FieldChange[];
};

export type LeadDetailLeadView = {
  id: string;
  ruc: string;
  isFavorite: boolean;
  legalName: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  executiveId: string;
  executiveName: string;
  createdBy: string;
  createdByName: string;
  updatedBy: string | null;
  updatedByName: string | null;
  stage: LeadStage;
  status: LeadStatus | null;
  priority: LeadPriority | null;
  nextStep: LeadNextStep;
  createdAt: number;
  updatedAt: number;
  reservationExpiresAt: number | null;
};

export type LeadDetailRateProposalView = {
  id: string;
  leadId: string;
  round: number;
  currency: Currency;
  fee: number;
  paybackPricing: number;
  proposedDebitRate: number;
  proposedCreditRate: number;
  proposedForeignRate: number;
  outcome: "pending" | "accepted" | "revision_requested";
  proposedBy: string;
  proposedAt: number;
  decidedAt: number | null;
};

export type LeadDetailVenueView = {
  id: string;
  leadId: string;
  tradeName: string;
  posQuantity: number;
  linkUrl: string | null;
  onlineUrl: string | null;
  onlineCollectionMode: CollectionMode | null;
  address: string;
  addressReference: string;
  district: string;
  province: string;
  department: string;
  solesAccount?: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
  createdAt: number;
  createdBy: string;
};

export type LeadDetailRateRevisionView = {
  id: string;
  proposalId: string;
  round: number;
  justification: string;
  requestedBy: string;
  requestedAt: number;
  files: LeadDetailRateRevisionFileView[];
};

export type LeadDetailFulfillmentDocView = {
  docKind: FulfillmentDocKind;
  artifactId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
  uploadedByUserId: string;
  uploadedAt: number;
};

export type LeadDetailFulfillmentUnitView = {
  id: string;
  label: string;
  venueId: string | null;
  serial: string | null;
  paymentUrl: string | null;
  paymentProofArtifactId: string | null;
  serviceRef: string | null;
  paymentValidated: boolean;
};

export type FulfillmentQueueRowView = {
  leadId: string;
  ruc: string;
  legalName: string | null;
  executiveName: string;
  productKind: ProductKind | null;
  currentStep: FulfillmentStep;
  pendingOwner: "executive" | "back_office" | null;
  waitingSince: number;
};

export type FulfillmentQueueView = {
  rows: FulfillmentQueueRowView[];
};

// Quotations awaiting the executive's decision, against the registration cap.
// Drives the blocked-registration affordance in the leads workspace.
export type PendingQuotationCountView = {
  count: number;
  limit: number;
};

export type LeadDetailFulfillmentStepView = {
  step: FulfillmentStep;
  status: "done" | "current" | "pending";
};

export type LeadDetailFulfillmentView = {
  orderId: string;
  productKind: ProductKind | null;
  currentStep: FulfillmentStep;
  pendingOwner: "executive" | "back_office" | null;
  steps: LeadDetailFulfillmentStepView[];
  units: LeadDetailFulfillmentUnitView[];
  documents: LeadDetailFulfillmentDocView[];
};

export type LeadDetailView = {
  lead: LeadDetailLeadView;
  profile: LeadDetailProfileView;
  repLegal: LeadDetailRepLegalView | undefined;
  rateProposals: LeadDetailRateProposalView[];
  venues: LeadDetailVenueView[];
  rateRevisions: LeadDetailRateRevisionView[];
  fulfillment: LeadDetailFulfillmentView | null;
  timeline: LeadTimelineItem[];
  availableActions: LeadAvailableAction[];
  blockingFields: LeadBlockingField[];
  sourceStatus: LeadDetailSourceStatusView;
};

type LeadDetailProfileView = {
  leadId: string;
  currentProvider: string;
  currentDebitRate: number;
  currentCreditRate: number;
  gpv: number;
  ticket: number;
  giroNegocio: string | null;
  settlementBank: SettlementBank;
  posCount: number;
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineCollectionMode: CollectionMode | null;
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
