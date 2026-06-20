import { enqueueNotifications } from "~/server/notifications/outbox";
import type { NotificationIntent } from "~/server/notifications/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { CommittedLeadEvent } from "~/server/workflow/lead/write/transition";

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

// Reactor: turn committed stage changes into notification-outbox rows. Reads the
// fresh lead row inside the same transaction, so the snapshot it sees already
// reflects the transition that produced the event.
export async function reactToStageChanges(
  tx: DatabaseExecutor,
  committed: CommittedLeadEvent[],
  now: number,
): Promise<void> {
  const intents: NotificationIntent[] = [];

  for (const { event, id } of committed) {
    if (event.eventType !== "workflow_stage_changed") continue;

    const lead = await tx
      .selectFrom("workflow_leads as lead")
      .innerJoin("organizations as org", "org.id", "lead.organization_id")
      .select(["org.ruc as ruc", "lead.executive_id as executiveId"])
      .where("lead.id", "=", event.leadId)
      .executeTakeFirst();

    if (!lead || lead.executiveId <= 0) continue;

    let branchId: number | null = null;
    if (event.payload.to === "PRICING") {
      const user = await tx
        .selectFrom("users")
        .select("branch_id")
        .where("id", "=", lead.executiveId)
        .executeTakeFirst();
      branchId = user?.branch_id ?? null;
    }

    intents.push(
      ...deriveLeadStageNotifications({
        eventId: id,
        leadId: event.leadId,
        toStage: event.payload.to,
        ruc: lead.ruc,
        executiveId: lead.executiveId,
        branchId,
      }),
    );
  }

  await enqueueNotifications(tx, intents, now);
}
