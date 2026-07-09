import { enqueueNotifications } from "~/server/notifications/intent/enqueue";
import type { NotificationIntent } from "~/server/notifications/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { BranchId, UserId } from "~/server/shared/ids";
import type { LeadHistoryEventDraftFor } from "~/server/workflow/lead/domain/history";
import type { CommittedLeadEvent } from "~/server/workflow/lead/write/transition";

type CommittedStageChange = {
  event: LeadHistoryEventDraftFor<"workflow_stage_changed">;
  id: string;
};

function isCommittedStageChange(
  committed: CommittedLeadEvent,
): committed is CommittedStageChange {
  return committed.event.eventType === "workflow_stage_changed";
}

export function deriveLeadStageNotifications(input: {
  eventId: string;
  leadId: string;
  toStage: string;
  ruc: string;
  executiveId: UserId;
  branchId: BranchId | null;
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
        // Promotion beyond the in-app bell: high-value client work.
        channels: ["in_app", "whatsapp"],
        priority: "high",
        title: "Cliente listo para afiliación",
        bodyText: `El cliente RUC ${input.ruc} aceptó la tarifa. Define la política digital para continuar.`,
        actionUrl: `/records/${input.leadId}`,
      },
    ];
  }

  return [];
}

// Reads the fresh lead row inside the same transaction, so the snapshot it
// sees already reflects the transition that produced the event.
export async function reactToStageChanges(
  tx: DatabaseExecutor,
  committed: CommittedLeadEvent[],
  now: Date,
): Promise<void> {
  const stageChanges = committed.filter(isCommittedStageChange);
  if (stageChanges.length === 0) return;

  const leadIds = [...new Set(stageChanges.map(({ event }) => event.leadId))];
  const leadRows = await tx
    .selectFrom("workflow_leads as lead")
    .innerJoin("organizations as org", "org.id", "lead.organization_id")
    .leftJoin("users as executive", "executive.id", "lead.executive_id")
    .select([
      "lead.id as leadId",
      "org.ruc as ruc",
      "lead.executive_id as executiveId",
      "executive.branch_id as branchId",
    ])
    .where("lead.id", "in", leadIds)
    .execute();
  const leadsById = new Map(leadRows.map((lead) => [lead.leadId, lead]));
  const intents: NotificationIntent[] = [];

  for (const { event, id } of stageChanges) {
    const lead = leadsById.get(event.leadId);

    if (!lead) continue;

    intents.push(
      ...deriveLeadStageNotifications({
        eventId: id,
        leadId: event.leadId,
        toStage: event.payload.to,
        ruc: lead.ruc,
        executiveId: lead.executiveId,
        branchId: event.payload.to === "PRICING" ? lead.branchId : null,
      }),
    );
  }

  await enqueueNotifications(tx, intents, now);
}
