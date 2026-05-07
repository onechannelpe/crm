import type { LeadHistoryEventDraft } from "../domain/history";

export type WorkflowNotificationIntent = {
  sourceEventId: string;
  leadId: string;
  executiveId: number;
  branchId: number;
  audienceKind: "executive" | "branch_role";
  audienceRoles: string[];
  eventType: string;
  priority: "high" | "normal" | "low";
  title: string;
  bodyText: string;
  actionUrl: string | null;
};

export function deriveWorkflowNotificationIntents(input: {
  sourceEventIds: string[];
  history: LeadHistoryEventDraft[];
  leadId: string;
  ruc: string;
  executiveId: number;
  branchId: number;
}): WorkflowNotificationIntent[] {
  const intents: WorkflowNotificationIntent[] = [];

  for (let index = 0; index < input.history.length; index++) {
    const event = input.history[index];
    const sourceEventId = input.sourceEventIds[index];
    if (!sourceEventId) {
      continue;
    }

    if (event.eventType === "workflow_stage_changed") {
      if (event.payload.to === "NEEDS_EXECUTIVE_INPUT") {
        intents.push({
          sourceEventId,
          leadId: input.leadId,
          executiveId: input.executiveId,
          branchId: input.branchId,
          audienceKind: "executive",
          audienceRoles: [],
          eventType: "lead.needs_executive_input",
          title: "Accion requerida",
          bodyText: `El prospecto RUC ${input.ruc} requiere tu informacion comercial`,
          actionUrl: "/records",
          priority: "high",
        });
      }

      if (event.payload.to === "READY_FOR_QUOTATION") {
        intents.push({
          sourceEventId,
          leadId: input.leadId,
          executiveId: input.executiveId,
          branchId: input.branchId,
          audienceKind: "branch_role",
          audienceRoles: ["back_office"],
          eventType: "lead.ready_for_quotation",
          title: "Prospecto listo para cotizacion",
          bodyText: `El prospecto RUC ${input.ruc} esta listo para cotizar`,
          actionUrl: `/records/${input.leadId}`,
          priority: "normal",
        });
      }

      if (event.payload.to === "READY_FOR_SALE") {
        intents.push({
          sourceEventId,
          leadId: input.leadId,
          executiveId: input.executiveId,
          branchId: input.branchId,
          audienceKind: "executive",
          audienceRoles: [],
          eventType: "lead.ready_for_sale",
          title: "Prospecto listo para venta",
          bodyText: `El prospecto RUC ${input.ruc} fue aprobado. Puedes registrar la venta.`,
          actionUrl: `/records/${input.leadId}`,
          priority: "high",
        });
      }
    }

    if (event.eventType === "quotation_created") {
      intents.push({
        sourceEventId,
        leadId: input.leadId,
        executiveId: input.executiveId,
        branchId: input.branchId,
        audienceKind: "executive",
        audienceRoles: [],
        eventType: "lead.quotation_created",
        title: "Cotizacion registrada",
        bodyText: `El prospecto RUC ${input.ruc} ya tiene una cotizacion registrada`,
        actionUrl: `/records/${input.leadId}`,
        priority: "normal",
      });
    }
  }

  return intents;
}
