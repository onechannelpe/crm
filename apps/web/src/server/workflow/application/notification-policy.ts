import type { NotificationIntent } from "~/server/notifications/types";

export function deriveLeadStageNotifications(input: {
  eventId: string;
  leadId: string;
  toStage: string;
  ruc: string;
  executiveId: number;
  branchId: number | null;
}): NotificationIntent[] {
  if (input.toStage === "NEEDS_EXECUTIVE_INPUT") {
    return [
      {
        id: `${input.eventId}:needs_exec`,
        eventType: "lead.needs_executive_input",
        audience: { kind: "user_ids", userIds: [input.executiveId] },
        channels: ["in_app"],
        priority: "high",
        title: "Accion requerida",
        bodyText: `El prospecto RUC ${input.ruc} requiere tu informacion comercial`,
        actionUrl: "/records",
      },
    ];
  }

  if (input.toStage === "READY_FOR_QUOTATION") {
    if (input.branchId === null) return [];
    return [
      {
        id: `${input.eventId}:ready_quote`,
        eventType: "lead.ready_for_quotation",
        audience: {
          kind: "branch_role",
          branchId: input.branchId,
          role: "back_office",
        },
        channels: ["in_app"],
        priority: "normal",
        title: "Prospecto listo para cotizacion",
        bodyText: `El prospecto RUC ${input.ruc} esta listo para cotizar`,
        actionUrl: `/records/${input.leadId}`,
      },
    ];
  }

  if (input.toStage === "READY_FOR_SALE") {
    return [
      {
        id: `${input.eventId}:ready_sale`,
        eventType: "lead.ready_for_sale",
        audience: { kind: "user_ids", userIds: [input.executiveId] },
        channels: ["in_app"],
        priority: "high",
        title: "Prospecto listo para venta",
        bodyText: `El prospecto RUC ${input.ruc} fue aprobado. Puedes registrar la venta.`,
        actionUrl: `/records/${input.leadId}`,
      },
    ];
  }

  return [];
}
