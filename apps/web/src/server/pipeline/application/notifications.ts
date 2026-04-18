import type { LeadId } from "~/server/pipeline/domain/lead-record";
import type { BranchId, UserId } from "~/server/shared/ids";

import type { PipelineNotificationCenter } from "./ports/notification-center";

export async function notifyExecutiveInputRequired(input: {
  center: PipelineNotificationCenter;
  executiveId: UserId;
  leadId: LeadId;
  ruc: string;
}) {
  await input.center.notifyUsers([input.executiveId], {
    type: "lead.needs_executive_input",
    title: "Accion requerida",
    bodyText: `El prospecto RUC ${input.ruc} requiere tu informacion comercial`,
    actionUrl: "/leads",
    priority: "high",
    dedupeKey: `lead_nei_${input.leadId}`,
  });
}

export async function notifyReadyForQuotation(input: {
  center: PipelineNotificationCenter;
  branchId: BranchId;
  leadId: LeadId;
  ruc: string;
}) {
  await input.center.notifyBranchRoles(input.branchId, ["back_office"], {
    type: "lead.ready_for_quotation",
    title: "Prospecto listo para cotizacion",
    bodyText: `El prospecto RUC ${input.ruc} esta listo para cotizar`,
    actionUrl: `/quotations/${input.leadId}`,
    priority: "normal",
    dedupeKey: `lead_rfq_${input.leadId}`,
  });
}

export async function notifyReadyForSale(input: {
  center: PipelineNotificationCenter;
  executiveId: UserId;
  leadId: LeadId;
  ruc: string;
}) {
  await input.center.notifyUsers([input.executiveId], {
    type: "lead.ready_for_sale",
    title: "Prospecto listo para venta",
    bodyText: `El prospecto RUC ${input.ruc} fue aprobado. Puedes registrar la venta.`,
    actionUrl: `/sales/new/${input.leadId}`,
    priority: "high",
    dedupeKey: `lead_rfs_${input.leadId}`,
  });
}
