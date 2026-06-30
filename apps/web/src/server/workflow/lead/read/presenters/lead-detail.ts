import type {
  LeadAvailableAction,
  LeadDetailFulfillmentView,
  LeadDetailLeadView,
  LeadDetailRateProposalView,
  LeadDetailRateRevisionView,
  LeadDetailVenueView,
  LeadDetailView,
} from "~/contracts/workflow/views";
import type {
  LegalRepresentative,
  OrganizationProfile,
} from "~/server/identity/organization/repo";
import type { DigitalPolicy } from "~/server/workflow/lead/digital-policy/repo";
import type { LeadHistoryEntry } from "~/server/workflow/lead/domain/history";
import type {
  LeadSourceStatus,
  RateProposal,
  RateRevision,
  RateRevisionFile,
} from "~/server/workflow/lead/domain/rows";
import type {
  LeadCommercialScope,
  LeadState,
} from "~/server/workflow/lead/domain/state";
import type { FulfillmentOrderDetails } from "~/server/workflow/lead/fulfillment/repo";
import {
  fulfillmentProgress,
  pendingOwnerForStep,
} from "~/server/workflow/lead/fulfillment/steps";
import {
  resolveLeadBlockingFields,
  resolveLeadNextStep,
} from "~/server/workflow/lead/read/lead-progress";
import type { LeadVenue } from "~/server/workflow/lead/venue/repo";

import type {
  LeadDetailRateRevisionFileView,
  LeadDetailProfileView,
  LeadDetailRepLegalView,
  LeadDetailSourceStatusView,
} from "./lead-detail-types";
import { presentTimeline } from "./timeline";

export type RateRevisionWithFiles = {
  revision: RateRevision;
  files: Array<
    RateRevisionFile & {
      safeDisplayFilename: string;
      detectedMime: string;
      sizeBytes: number;
    }
  >;
};

export type LeadDetailSource = {
  lead: LeadState;
  isFavorite: boolean;
  executiveName: string;
  createdByName: string;
  updatedByName: string | null;
  commercialScope: LeadCommercialScope;
  digitalPolicy: DigitalPolicy | undefined;
  rateProposals: RateProposal[];
  venues: LeadVenue[];
  rateRevisions: RateRevisionWithFiles[];
  history: LeadHistoryEntry[];
  canRevealFullTimeline: boolean;
  availableActions: LeadAvailableAction[];
  sourceStatus: LeadSourceStatus;
  organization: OrganizationProfile;
  legalRepresentative: LegalRepresentative | undefined;
  fulfillment: FulfillmentOrderDetails | null;
};

function toFulfillmentView(
  details: FulfillmentOrderDetails,
): LeadDetailFulfillmentView {
  return {
    orderId: details.order.id,
    productKind: details.order.productKind,
    currentStep: details.order.currentStep,
    pendingOwner: pendingOwnerForStep(details.order.currentStep),
    steps: fulfillmentProgress(
      details.order.productKind,
      details.order.currentStep,
    ),
    units: details.units.map((unit) => ({
      id: unit.id,
      label: unit.label,
      venueId: unit.venueId,
      serial: unit.serial,
      paymentUrl: unit.paymentUrl,
      paymentProofArtifactId: unit.paymentProofArtifactId,
      serviceRef: unit.serviceRef,
      paymentValidated: unit.paymentValidated,
    })),
    documents: details.documents.map((doc) => ({
      docKind: doc.docKind,
      artifactId: doc.artifactId,
      filename: doc.safeDisplayFilename,
      detectedMime: doc.detectedMime,
      sizeBytes: doc.sizeBytes,
      uploadedByUserId: doc.uploadedByUserId,
      uploadedAt: doc.createdAt.getTime(),
    })),
  };
}

function toLeadSourceStatus(
  sourceStatus: LeadSourceStatus,
): LeadDetailSourceStatusView {
  return {
    sunat: {
      status: sourceStatus.sunat.status,
      fetchedAt: sourceStatus.sunat.fetchedAt?.getTime() ?? null,
      district: sourceStatus.sunat.district,
      department: sourceStatus.sunat.department,
      contributorStatus: sourceStatus.sunat.contributorStatus,
      contributorCondition: sourceStatus.sunat.contributorCondition,
      economicActivities: sourceStatus.sunat.economicActivities,
      payloadAvailable: sourceStatus.sunat.payloadAvailable,
    },
  };
}

function toLeadDetailLead(
  lead: LeadState,
  organization: OrganizationProfile,
  isFavorite: boolean,
  executiveName: string,
  createdByName: string,
  updatedByName: string | null,
): LeadDetailLeadView {
  return {
    id: lead.id,
    ruc: organization.ruc,
    isFavorite,
    legalName: organization.legalName,
    address: organization.address,
    district: organization.district,
    department: organization.department,
    executiveId: lead.executiveId,
    executiveName,
    createdBy: lead.createdBy,
    createdByName,
    updatedBy: lead.updatedBy,
    updatedByName,
    stage: lead.stage,
    status: lead.status,
    priority: lead.priority,
    nextStep: resolveLeadNextStep(lead),
    createdAt: lead.createdAt.getTime(),
    updatedAt: lead.updatedAt.getTime(),
    reservationExpiresAt: lead.reservationExpiresAt?.getTime() ?? null,
  };
}

function toLeadDetailProfile(
  leadId: string,
  commercial: LeadCommercialScope,
  digitalPolicy: DigitalPolicy | undefined,
  organization: OrganizationProfile,
): LeadDetailProfileView {
  return {
    leadId,
    currentProvider: commercial.currentProvider,
    currentDebitRate: commercial.currentDebitRate,
    currentCreditRate: commercial.currentCreditRate,
    gpv: commercial.gpv,
    ticket: commercial.ticket,
    giroNegocio: organization.giroNegocio,
    settlementBank: commercial.settlementBank,
    posCount: commercial.posCount,
    linkScope: digitalPolicy?.linkScope ?? "none",
    linkUrl: digitalPolicy?.linkUrl ?? null,
    onlineScope: digitalPolicy?.onlineScope ?? "none",
    onlineUrl: digitalPolicy?.onlineUrl ?? null,
    onlineCollectionMode: digitalPolicy?.onlineCollectionMode ?? null,
  };
}

function toLeadDetailRepLegal(
  legalRepresentative: LegalRepresentative,
): LeadDetailRepLegalView {
  return {
    nombres: legalRepresentative.nombres,
    apellidoPaterno: legalRepresentative.apellidoPaterno,
    apellidoMaterno: legalRepresentative.apellidoMaterno,
    dni: legalRepresentative.dni,
    telefono: legalRepresentative.telefono ?? null,
    email: legalRepresentative.email ?? null,
  };
}

function toRateProposalView(
  proposal: RateProposal,
): LeadDetailRateProposalView {
  return {
    id: proposal.id,
    leadId: proposal.leadId,
    round: proposal.round,
    currency: proposal.currency,
    fee: proposal.fee,
    paybackPricing: proposal.paybackPricing,
    proposedDebitRate: proposal.proposedDebitRate,
    proposedCreditRate: proposal.proposedCreditRate,
    proposedForeignRate: proposal.proposedForeignRate,
    outcome: proposal.outcome,
    proposedBy: proposal.proposedBy,
    proposedAt: proposal.proposedAt.getTime(),
    decidedAt: proposal.decidedAt?.getTime() ?? null,
  };
}

function toLeadDetailVenue(venue: LeadVenue): LeadDetailVenueView {
  const result: LeadDetailVenueView = {
    id: venue.id,
    leadId: venue.leadId,
    tradeName: venue.tradeName,
    posQuantity: venue.posQuantity,
    linkUrl: venue.linkUrl,
    onlineUrl: venue.onlineUrl,
    onlineCollectionMode: venue.onlineCollectionMode,
    address: venue.address,
    addressReference: venue.addressReference,
    district: venue.district,
    province: venue.province,
    department: venue.department,
    createdAt: venue.createdAt.getTime(),
    createdBy: venue.createdBy,
  };

  if (venue.solesAccount) result.solesAccount = venue.solesAccount;
  if (venue.dollarAccount) result.dollarAccount = venue.dollarAccount;

  return result;
}

function toRateRevisionFileView(
  file: RateRevisionFile & {
    safeDisplayFilename: string;
    detectedMime: string;
    sizeBytes: number;
  },
): LeadDetailRateRevisionFileView {
  return {
    artifactId: file.artifactId,
    filename: file.safeDisplayFilename,
    detectedMime: file.detectedMime,
    sizeBytes: file.sizeBytes,
  };
}

function toRateRevisionView(
  item: RateRevisionWithFiles,
): LeadDetailRateRevisionView {
  return {
    id: item.revision.id,
    proposalId: item.revision.proposalId,
    round: item.revision.round,
    justification: item.revision.justification,
    requestedBy: item.revision.requestedBy,
    requestedAt: item.revision.requestedAt.getTime(),
    files: item.files.map(toRateRevisionFileView),
  };
}

export function presentLeadDetail(source: LeadDetailSource): LeadDetailView {
  const profile = toLeadDetailProfile(
    source.lead.id,
    source.commercialScope,
    source.digitalPolicy,
    source.organization,
  );

  return {
    lead: toLeadDetailLead(
      source.lead,
      source.organization,
      source.isFavorite,
      source.executiveName,
      source.createdByName,
      source.updatedByName,
    ),
    profile,
    repLegal: source.legalRepresentative
      ? toLeadDetailRepLegal(source.legalRepresentative)
      : undefined,
    rateProposals: source.rateProposals.map(toRateProposalView),
    venues: source.venues.map(toLeadDetailVenue),
    rateRevisions: source.rateRevisions.map(toRateRevisionView),
    fulfillment: source.fulfillment
      ? toFulfillmentView(source.fulfillment)
      : null,
    timeline: presentTimeline(source.history, source.canRevealFullTimeline),
    availableActions: source.availableActions,
    blockingFields: resolveLeadBlockingFields({
      stage: source.lead.stage,
      digitalPolicy: source.digitalPolicy,
      venuesWithAccountsCount: source.venues.filter((v) => v.solesAccount)
        .length,
    }),
    sourceStatus: toLeadSourceStatus(source.sourceStatus),
  };
}
