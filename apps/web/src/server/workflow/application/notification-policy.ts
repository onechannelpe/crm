import type { NotificationIntent } from "~/server/notifications/types";

export function deriveLeadStageNotifications(input: {
  eventId: string;
  leadId: string;
  toStage: string;
  ruc: string;
  executiveId: number;
  branchId: number | null;
}): NotificationIntent[] {
  if (input.toStage === "SCOPING") {
    return [
      {
        id: `${input.eventId}:needs_exec`,
        eventType: "lead.needs_executive_input",
        audience: { kind: "user_ids", userIds: [input.executiveId] },
        channels: ["in_app"],
        priority: "high",
        title: "Acción requerida",
        bodyText: `El cliente RUC ${input.ruc} requiere tu información comercial`,
        actionUrl: "/records",
      },
    ];
  }

  if (input.toStage === "QUOTING") {
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
        title: "Cliente listo para cotización",
        bodyText: `El cliente RUC ${input.ruc} está listo para cotizar`,
        actionUrl: `/records/${input.leadId}`,
      },
    ];
  }

  if (input.toStage === "SETUP_PLAN") {
    return [
      {
        id: `${input.eventId}:ready_sale`,
        eventType: "lead.ready_for_sale",
        audience: { kind: "user_ids", userIds: [input.executiveId] },
        channels: ["in_app"],
        priority: "high",
        title: "Cliente listo para afiliación",
        bodyText: `El cliente RUC ${input.ruc} fue aprobado. Define la política digital para continuar.`,
        actionUrl: `/records/${input.leadId}`,
      },
    ];
  }

  return [];
}
