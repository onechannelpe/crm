import type { LeadHistoryEntry } from "../../domain/history";
import type { Lead } from "../../domain/lead";
import type { LeadAvailableAction, LeadDetailView } from "../contracts";
import type { LeadCommercialInput } from "../ports/commercial-input-repository";
import type { LeadQuotation } from "../ports/quotation-repository";
import type { LeadSale } from "../ports/sale-repository";
import { presentTimeline } from "./timeline";

export type LeadDetailSource = {
  lead: Lead;
  commercialInput: LeadCommercialInput | undefined;
  quotations: LeadQuotation[];
  sale: LeadSale | undefined;
  history: LeadHistoryEntry[];
  canRevealFullTimeline: boolean;
  availableActions: LeadAvailableAction[];
};

function toLeadDetailLead(lead: Lead): LeadDetailView["lead"] {
  return {
    id: lead.id,
    ruc: lead.ruc,
    razonSocial: lead.razonSocial,
    address: lead.address,
    executiveId: lead.executiveId,
    stage: lead.stage,
    status: lead.status,
    prioridad: lead.prioridad,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

function toLeadDetailCommercialInput(
  input: LeadCommercialInput,
): NonNullable<LeadDetailView["commercialInput"]> {
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
): LeadDetailView["quotations"][number] {
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

function toLeadDetailSale(sale: LeadSale): NonNullable<LeadDetailView["sale"]> {
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
    lead: toLeadDetailLead(source.lead),
    commercialInput: source.commercialInput
      ? toLeadDetailCommercialInput(source.commercialInput)
      : undefined,
    quotations: source.quotations.map(toLeadDetailQuotation),
    sale: source.sale ? toLeadDetailSale(source.sale) : undefined,
    timeline: presentTimeline(source.history, source.canRevealFullTimeline),
    availableActions: source.availableActions,
  };
}
