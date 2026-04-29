import type { LeadHistoryEntry } from "../../domain/history";
import type { LeadRecord } from "../../domain/lead-record";
import type { LeadAvailableAction } from "../contracts/lead-available-action";
import type { LeadCommercialInput } from "../ports/commercial-input-repository";
import type {
  LeadNegotiationRequest,
  LeadNegotiationFile,
} from "../ports/negotiation-request-repository";
import type { LeadQuotation } from "../ports/quotation-repository";
import type { LeadSale, LeadSaleVenue } from "../ports/sale-repository";
import type { LeadSourceStatus } from "../ports/source-status-repository";
import type {
  LeadDetailCommercialInputView,
  LeadDetailLeadView,
  LeadDetailNegotiationFileView,
  LeadDetailNegotiationRequestView,
  LeadDetailQuotationView,
  LeadDetailSaleView,
  LeadDetailSaleVenueView,
  LeadDetailSourceStatusView,
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
  commercialInput: LeadCommercialInput | undefined;
  quotations: LeadQuotation[];
  sale: LeadSale | undefined;
  venues: LeadSaleVenue[];
  negotiationRequests: NegotiationRequestWithFiles[];
  history: LeadHistoryEntry[];
  canRevealFullTimeline: boolean;
  availableActions: LeadAvailableAction[];
  sourceStatus: LeadSourceStatus;
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
  isFavorite: boolean,
  executiveName: string,
  createdByName: string,
  updatedByName: string | null,
  sale: LeadSale | undefined,
): LeadDetailLeadView {
  return {
    id: lead.id,
    ruc: lead.ruc,
    isFavorite,
    razonSocial: lead.razonSocial,
    address: lead.address,
    district: lead.district,
    department: lead.department,
    executiveId: lead.executiveId,
    executiveName,
    createdBy: lead.createdBy,
    createdByName,
    updatedBy: lead.updatedBy,
    updatedByName,
    stage: lead.stage,
    status: lead.status,
    prioridad: lead.prioridad,
    nextStep: presentLeadNextStep({ lead, sale }),
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

function toLeadDetailCommercialInput(
  input: LeadCommercialInput,
): LeadDetailCommercialInputView {
  return {
    leadId: input.leadId,
    proveedorActual: input.proveedorActual,
    tasaActual: input.tasaActual,
    gpv: input.gpv,
    ticket: input.ticket,
    giroNegocio: input.giroNegocio,
    tipoProducto: input.tipoProducto,
    urlCliente: input.urlCliente,
    modalidadCobro: input.modalidadCobro,
    repLegalNombres: input.repLegalNombres,
    repLegalApellidoPaterno: input.repLegalApellidoPaterno,
    repLegalApellidoMaterno: input.repLegalApellidoMaterno,
    repLegalDni: input.repLegalDni,
    repLegalTelefono: input.repLegalTelefono,
    repLegalEmail: input.repLegalEmail,
    updatedAt: input.updatedAt,
    updatedBy: input.updatedBy,
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

function toLeadDetailSale(sale: LeadSale): LeadDetailSaleView {
  return {
    id: sale.id,
    leadId: sale.leadId,
    executiveId: sale.executiveId,
    createdAt: sale.createdAt,
  };
}

function toLeadDetailSaleVenue(
  venue: LeadSaleVenue,
): LeadDetailSaleVenueView {
  return {
    id: venue.id,
    saleId: venue.saleId,
    leadId: venue.leadId,
    nombreComercial: venue.nombreComercial,
    cantidadPos: venue.cantidadPos,
    direccion: venue.direccion,
    referencia: venue.referencia,
    distrito: venue.distrito,
    provincia: venue.provincia,
    departamento: venue.departamento,
    bancoSoles: venue.bancoSoles,
    tipoCuentaSoles: venue.tipoCuentaSoles,
    nroCuentaSoles: venue.nroCuentaSoles,
    cciSoles: venue.cciSoles,
    bancoDolares: venue.bancoDolares,
    tipoCuentaDolares: venue.tipoCuentaDolares,
    nroCuentaDolares: venue.nroCuentaDolares,
    cciDolares: venue.cciDolares,
    abono: venue.abono,
    createdAt: venue.createdAt,
    createdBy: venue.createdBy,
  };
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
      source.isFavorite,
      source.executiveName,
      source.createdByName,
      source.updatedByName,
      source.sale,
    ),
    commercialInput: source.commercialInput
      ? toLeadDetailCommercialInput(source.commercialInput)
      : undefined,
    quotations: source.quotations.map(toLeadDetailQuotation),
    sale: source.sale ? toLeadDetailSale(source.sale) : undefined,
    venues: source.venues.map(toLeadDetailSaleVenue),
    negotiationRequests: source.negotiationRequests.map(
      toNegotiationRequestView,
    ),
    timeline: presentTimeline(source.history, source.canRevealFullTimeline),
    availableActions: source.availableActions,
    blockingFields: presentLeadBlockingFields({
      lead: source.lead,
      venueCount: source.venues.length,
    }),
    sourceStatus: toLeadSourceStatus(source.sourceStatus),
  };
}
