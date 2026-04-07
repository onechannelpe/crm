import type { LeadHistoryEntry } from "../../domain/history";
import type { LeadRecord } from "../../domain/lead-record";
import type { LeadAvailableAction } from "../contracts/lead-available-action";
import type { LeadCommercialInput } from "../ports/commercial-input-repository";
import type { LeadQuotation } from "../ports/quotation-repository";
import type { LeadSale } from "../ports/sale-repository";
import type { LeadSourceStatus } from "../ports/source-status-repository";
import type {
  LeadDetailCommercialInputView,
  LeadDetailLeadView,
  LeadDetailQuotationView,
  LeadDetailSaleView,
  LeadDetailSourceStatusView,
  LeadDetailView,
} from "../queries/views/lead-detail";
import {
  presentLeadBlockingFields,
  presentLeadNextStep,
} from "./lead-progress";
import { presentTimeline } from "./timeline";

export type LeadDetailSource = {
  lead: LeadRecord;
  commercialInput: LeadCommercialInput | undefined;
  quotations: LeadQuotation[];
  sale: LeadSale | undefined;
  history: LeadHistoryEntry[];
  canRevealFullTimeline: boolean;
  availableActions: LeadAvailableAction[];
  sourceStatus: LeadSourceStatus;
};

function toLeadSourceStatus(
  sourceStatus: LeadSourceStatus,
): LeadDetailSourceStatusView {
  return {
    engine: {
      status: sourceStatus.engine.status,
      fetchedAt: sourceStatus.engine.fetchedAt,
      fields: sourceStatus.engine.fields,
    },
    sunat: {
      status: sourceStatus.sunat.status,
      fetchedAt: sourceStatus.sunat.fetchedAt,
      legalName: sourceStatus.sunat.legalName,
      payloadAvailable: sourceStatus.sunat.payloadAvailable,
    },
  };
}

function toLeadDetailLead(
  lead: LeadRecord,
  sale: LeadSale | undefined,
): LeadDetailLeadView {
  return {
    id: lead.id,
    ruc: lead.ruc,
    razonSocial: lead.razonSocial,
    address: lead.address,
    executiveId: lead.executiveId,
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
    abono: input.abono,
    cantidadPos: input.cantidadPos,
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
    proveedorActual: sale.proveedorActual,
    tasaActual: sale.tasaActual,
    gpv: sale.gpv,
    ticket: sale.ticket,
    abono: sale.abono,
    cantidadPos: sale.cantidadPos,
    banco: sale.banco,
    nroCuenta: sale.nroCuenta,
    cci: sale.cci,
    createdAt: sale.createdAt,
  };
}

export function presentLeadDetail(source: LeadDetailSource): LeadDetailView {
  return {
    lead: toLeadDetailLead(source.lead, source.sale),
    commercialInput: source.commercialInput
      ? toLeadDetailCommercialInput(source.commercialInput)
      : undefined,
    quotations: source.quotations.map(toLeadDetailQuotation),
    sale: source.sale ? toLeadDetailSale(source.sale) : undefined,
    timeline: presentTimeline(source.history, source.canRevealFullTimeline),
    availableActions: source.availableActions,
    blockingFields: presentLeadBlockingFields({
      lead: source.lead,
      sale: source.sale,
    }),
    sourceStatus: toLeadSourceStatus(source.sourceStatus),
  };
}
