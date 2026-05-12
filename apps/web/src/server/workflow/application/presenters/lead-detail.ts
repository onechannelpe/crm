import type { LeadHistoryEntry } from "../../domain/history";
import type { LeadRecord } from "../../domain/lead-record";
import type { LeadAvailableAction } from "../contracts/lead-available-action";
import type { LeadProfile } from "../ports/lead-profile-repository";
import type {
  LeadNegotiationRequest,
  LeadNegotiationFile,
} from "../ports/negotiation-request-repository";
import type {
  LegalRepresentative,
  OrganizationProfile,
} from "../ports/party-repository";
import type { LeadQuotation } from "../ports/quotation-repository";
import type { LeadVenue } from "../ports/sale-repository";
import type { LeadSourceStatus } from "../ports/source-status-repository";
import type {
  LeadDetailLeadView,
  LeadDetailNegotiationFileView,
  LeadDetailNegotiationRequestView,
  LeadDetailProfileView,
  LeadDetailQuotationView,
  LeadDetailRepLegalView,
  LeadDetailSourceStatusView,
  LeadDetailVenueView,
  LeadDetailView,
} from "../queries/views/lead-detail";
import {
  presentLeadBlockingFields,
  presentLeadNextStep,
} from "./lead-progress";
import { presentTimeline } from "./timeline";

export type NegotiationRequestWithFiles = {
  request: LeadNegotiationRequest;
  files: Array<
    LeadNegotiationFile & {
      safeDisplayFilename: string;
      detectedMime: string;
      sizeBytes: number;
    }
  >;
};

export type LeadDetailSource = {
  lead: LeadRecord;
  isFavorite: boolean;
  executiveName: string;
  createdByName: string;
  updatedByName: string | null;
  profile: LeadProfile | undefined;
  quotations: LeadQuotation[];
  venues: LeadVenue[];
  negotiationRequests: NegotiationRequestWithFiles[];
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
  lead: LeadRecord,
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
    nextStep: presentLeadNextStep({ lead }),
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

function toLeadDetailQuotation(
  quotation: LeadQuotation,
): LeadDetailQuotationView {
  return {
    id: quotation.id,
    leadId: quotation.leadId,
    version: quotation.version,
    moneda: quotation.moneda,
    fee: quotation.fee,
    paybackPricing: quotation.paybackPricing,
    tarifaDebito: quotation.tarifaDebito,
    tarifaCredito: quotation.tarifaCredito,
    tarifaForaneo: quotation.tarifaForaneo,
    createdAt: quotation.createdAt,
    createdBy: quotation.createdBy,
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

function toNegotiationFileView(
  file: LeadNegotiationFile & {
    safeDisplayFilename: string;
    detectedMime: string;
    sizeBytes: number;
  },
): LeadDetailNegotiationFileView {
  return {
    artifactId: file.artifactId,
    filename: file.safeDisplayFilename,
    detectedMime: file.detectedMime,
    sizeBytes: file.sizeBytes,
  };
}

function toNegotiationRequestView(
  item: NegotiationRequestWithFiles,
): LeadDetailNegotiationRequestView {
  return {
    id: item.request.id,
    round: item.request.round,
    justification: item.request.justification,
    requestedBy: item.request.requestedBy,
    requestedAt: item.request.requestedAt,
    files: item.files.map(toNegotiationFileView),
  };
}

export function presentLeadDetail(source: LeadDetailSource): LeadDetailView {
  return {
    lead: toLeadDetailLead(
      source.lead,
      source.organization,
      source.isFavorite,
      source.executiveName,
      source.createdByName,
      source.updatedByName,
    ),
    profile: source.profile
      ? toLeadDetailProfile(source.profile, source.organization)
      : undefined,
    repLegal: source.legalRepresentative
      ? toLeadDetailRepLegal(source.legalRepresentative)
      : undefined,
    quotations: source.quotations.map(toLeadDetailQuotation),
    venues: source.venues.map(toLeadDetailVenue),
    negotiationRequests: source.negotiationRequests.map(
      toNegotiationRequestView,
    ),
    timeline: presentTimeline(source.history, source.canRevealFullTimeline),
    availableActions: source.availableActions,
    blockingFields: presentLeadBlockingFields({
      lead: source.lead,
      profile: source.profile,
      organization: source.organization,
      venuesWithAccountsCount: source.venues.filter((v) => v.solesAccount)
        .length,
    }),
    sourceStatus: toLeadSourceStatus(source.sourceStatus),
  };
}
