import type {
  LeadAvailableAction,
  LeadDetailLeadView,
  LeadDetailRateProposalView,
  LeadDetailRateRevisionView,
  LeadDetailVenueView,
  LeadDetailView,
} from "~/server/workflow/types";

import type { LeadHistoryEntry } from "../../domain/history";
import {
  resolveLeadBlockingFields,
  resolveLeadNextStep,
} from "../../domain/lead-progress";
import type { LeadState } from "../../domain/lead/state";
import type {
  LeadProfile,
  RateRevision,
  RateRevisionFile,
  LegalRepresentative,
  OrganizationProfile,
  RateProposal,
  LeadVenue,
  LeadSourceStatus,
} from "../ports/entities";
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
  profile: LeadProfile | undefined;
  rateProposals: RateProposal[];
  venues: LeadVenue[];
  rateRevisions: RateRevisionWithFiles[];
  history: LeadHistoryEntry[];
  canRevealFullTimeline: boolean;
  availableActions: LeadAvailableAction[];
  sourceStatus: LeadSourceStatus;
  organization: OrganizationProfile;
  legalRepresentative: LegalRepresentative | undefined;
};

function toLeadSourceStatus(
  sourceStatus: LeadSourceStatus,
): LeadDetailSourceStatusView {
  return {
    sunat: {
      status: sourceStatus.sunat.status,
      fetchedAt: sourceStatus.sunat.fetchedAt,
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
    razonSocial: organization.name,
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
    prioridad: lead.prioridad,
    nextStep: resolveLeadNextStep(lead),
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

function toLeadDetailProfile(
  profile: LeadProfile,
  organization: OrganizationProfile | undefined,
): LeadDetailProfileView {
  return {
    leadId: profile.leadId,
    proveedorActual: profile.proveedorActual,
    tasaActual: profile.tasaActual,
    gpv: profile.gpv,
    ticket: profile.ticket,
    giroNegocio: organization?.giroNegocio ?? null,
    abonoBank: profile.abonoBank,
    posTotal: profile.posTotal,
    linkScope: profile.linkScope,
    linkUrl: profile.linkUrl,
    onlineScope: profile.onlineScope,
    onlineUrl: profile.onlineUrl,
    onlineModalidad: profile.onlineModalidad,
    updatedAt: profile.updatedAt,
    updatedBy: profile.updatedBy,
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
    moneda: proposal.moneda,
    fee: proposal.fee,
    paybackPricing: proposal.paybackPricing,
    tarifaDebito: proposal.tarifaDebito,
    tarifaCredito: proposal.tarifaCredito,
    tarifaForaneo: proposal.tarifaForaneo,
    outcome: proposal.outcome,
    proposedBy: proposal.proposedBy,
    proposedAt: proposal.proposedAt,
    validityDays: proposal.validityDays,
    expiresAt: proposal.expiresAt,
    decidedAt: proposal.decidedAt,
  };
}

function toLeadDetailVenue(venue: LeadVenue): LeadDetailVenueView {
  const result: LeadDetailVenueView = {
    id: venue.id,
    leadId: venue.leadId,
    nombreComercial: venue.nombreComercial,
    posQuantity: venue.posQuantity,
    linkUrl: venue.linkUrl,
    onlineUrl: venue.onlineUrl,
    onlineModalidad: venue.onlineModalidad,
    direccion: venue.direccion,
    referencia: venue.referencia,
    distrito: venue.distrito,
    provincia: venue.provincia,
    departamento: venue.departamento,
    createdAt: venue.createdAt,
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
    requestedAt: item.revision.requestedAt,
    files: item.files.map(toRateRevisionFileView),
  };
}

export function presentLeadDetail(source: LeadDetailSource): LeadDetailView {
  const profile = source.profile
    ? toLeadDetailProfile(source.profile, source.organization)
    : undefined;

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
    timeline: presentTimeline(source.history, source.canRevealFullTimeline),
    availableActions: source.availableActions,
    blockingFields: resolveLeadBlockingFields({
      stage: source.lead.stage,
      profile,
      venuesWithAccountsCount: source.venues.filter((v) => v.solesAccount)
        .length,
    }),
    sourceStatus: toLeadSourceStatus(source.sourceStatus),
  };
}
