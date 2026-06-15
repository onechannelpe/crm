import type { NotificationIntent } from "~/server/notifications/types";

export function deriveLeadStageNotifications(input: {
  eventId: string;
  leadId: string;
  toStage: string;
  ruc: string;
  executiveId: number;
  branchId: number | null;
}): NotificationIntent[] {
  // Availability qualification cleared the lead: back office now proposes a rate.
  if (input.toStage === "PRICING") {
    if (input.branchId === null) return [];
    return [
      {
        id: `${input.eventId}:ready_pricing`,
        eventType: "lead.ready_for_quotation",
        audience: {
          kind: "branch_role",
          branchId: input.branchId,
          role: "back_office",
        },
        channels: ["in_app"],
        priority: "normal",
        title: "Cliente listo para tarifa",
        bodyText: `El cliente RUC ${input.ruc} está listo para proponer tarifa`,
        actionUrl: `/records/${input.leadId}`,
      },
    ];
  }

  // The executive accepted the rate: time to set up the affiliation.
  if (input.toStage === "SETUP") {
    return [
      {
        id: `${input.eventId}:ready_setup`,
        eventType: "lead.ready_for_sale",
        audience: { kind: "user_ids", userIds: [input.executiveId] },
        channels: ["in_app"],
        priority: "high",
        title: "Cliente listo para afiliación",
        bodyText: `El cliente RUC ${input.ruc} aceptó la tarifa. Define la política digital para continuar.`,
        actionUrl: `/records/${input.leadId}`,
      },
    ];
  }

  return [];
}
