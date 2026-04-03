import type { Role } from "~/lib/auth/access/rbac";

import type { LeadHistoryEntry } from "../../domain/history";
import type { Lead } from "../../domain/lead";
import { canRevealFullTimeline } from "../policies/access";
import {
  resolveAvailableActions,
  type LeadAction,
} from "../policies/action-availability";
import type { LeadCommercialInput } from "../ports/commercial-input-repository";
import type { LeadQuotation } from "../ports/quotation-repository";
import type { LeadSale } from "../ports/sale-repository";
import { presentTimeline, type TimelineItem } from "./timeline";

export type LeadDetailSource = {
  actorUserId: number;
  actorRole: Role;
  lead: Lead;
  commercialInput: LeadCommercialInput | undefined;
  quotations: LeadQuotation[];
  sale: LeadSale | undefined;
  history: LeadHistoryEntry[];
};

export type LeadDetailLead = {
  id: number;
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
  stage: Lead["stage"];
  status: Lead["status"];
  prioridad: Lead["prioridad"];
  createdAt: number;
  updatedAt: number;
};

export type LeadDetailCommercialInput = {
  leadId: number;
  proveedorActual: string | null;
  tasaActual: number | null;
  gpv: number | null;
  ticket: number | null;
  abono: number | null;
  cantidadPos: number | null;
  updatedAt: number;
  updatedBy: number;
};

export type LeadDetailQuotation = {
  id: number;
  leadId: number;
  version: number;
  moneda: "PEN" | "USD";
  fee: number;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  createdAt: number;
  createdBy: number;
};

export type LeadDetailSale = {
  id: number;
  leadId: number;
  executiveId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
  banco: string;
  nroCuenta: string;
  cci: string | null;
  createdAt: number;
};

export type LeadDetailOutput = {
  lead: LeadDetailLead;
  commercialInput: LeadDetailCommercialInput | undefined;
  quotations: LeadDetailQuotation[];
  sale: LeadDetailSale | undefined;
  timeline: TimelineItem[];
  availableActions: LeadAction[];
};

function toLeadDetailLead(lead: Lead): LeadDetailLead {
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
): LeadDetailCommercialInput {
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

function toLeadDetailQuotation(quotation: LeadQuotation): LeadDetailQuotation {
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

function toLeadDetailSale(sale: LeadSale): LeadDetailSale {
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

export function presentLeadDetail(source: LeadDetailSource): LeadDetailOutput {
  return {
    lead: toLeadDetailLead(source.lead),
    commercialInput: source.commercialInput
      ? toLeadDetailCommercialInput(source.commercialInput)
      : undefined,
    quotations: source.quotations.map(toLeadDetailQuotation),
    sale: source.sale ? toLeadDetailSale(source.sale) : undefined,
    timeline: presentTimeline(
      source.history,
      canRevealFullTimeline(source.actorRole),
    ),
    availableActions: resolveAvailableActions({
      actorUserId: source.actorUserId,
      actorRole: source.actorRole,
      executiveId: source.lead.executiveId,
      stage: source.lead.stage,
    }),
  };
}
