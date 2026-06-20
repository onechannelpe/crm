import { enqueueNotifications } from "~/server/notifications/outbox";
import type { NotificationIntent } from "~/server/notifications/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { LeadEvent } from "~/server/workflow/lead/domain/events";
import type { LeadState } from "~/server/workflow/lead/domain/state";

export async function enqueueLeadEventNotifications(
  db: DatabaseExecutor,
  input: { lead: LeadState; events: LeadEvent[]; eventIds: string[] },
  now: number,
): Promise<void> {
  const stageChanged = input.events
    .map((event, index) => ({ event, id: input.eventIds[index] }))
    .filter(({ event }) => event.eventType === "workflow_stage_changed");

  if (stageChanged.length === 0) return;

  const branchRow = await db
    .selectFrom("users")
    .select("branch_id")
    .where("id", "=", input.lead.executiveId)
    .executeTakeFirst();
  const branchId = branchRow?.branch_id ?? null;

  const intents = stageChanged.flatMap(({ event, id }) => {
    if (event.eventType !== "workflow_stage_changed") return [];
    return deriveLeadStageNotifications({
      eventId: id,
      leadId: input.lead.id,
      toStage: event.payload.to,
      ruc: input.lead.ruc,
      executiveId: input.lead.executiveId,
      branchId,
    });
  });

  await enqueueNotifications(db, intents, now);
}

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
