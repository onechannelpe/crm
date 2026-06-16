import type { DomainError } from "~/server/shared/domain-error";
import type { EventsRepo } from "~/server/shared/repos-events";
import { Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import type { LeadDraft } from "../../domain/lead/state";
import { toLeadEventAppend } from "../lead-events";
import type { LeadAssignmentRepository, LeadRepository } from "../ports/lead";

type EffectsDeps = {
  leads: LeadRepository;
  leadAssignments: LeadAssignmentRepository;
  events: Pick<EventsRepo, "append">;
};

export async function writeLeadRegistrationEffects(input: {
  deps: EffectsDeps;
  actorUserId: number;
  executiveId: number;
  draft: LeadDraft;
  now: number;
}): Promise<Result<{ leadId: string }, DomainError>> {
  const leadId = await input.deps.leads.insert(input.draft);

  await input.deps.leadAssignments.insert({
    leadId,
    executiveId: input.executiveId,
    assignedBy: input.actorUserId,
    isActive: true,
    assignedAt: input.now,
  });

  await input.deps.events.append([
    toLeadEventAppend(
      createHistoryEvent({
        leadId,
        eventType: "lead_registered",
        actorUserId: input.actorUserId,
        payload: { ruc: input.draft.ruc, toStage: "QUALIFYING" },
        occurredAt: input.now,
      }),
    ),
    toLeadEventAppend(
      createHistoryEvent({
        leadId,
        eventType: "lead_assigned",
        actorUserId: input.actorUserId,
        subjectUserId: input.executiveId,
        payload: { executiveId: input.executiveId },
        occurredAt: input.now,
      }),
    ),
  ]);

  return Ok({ leadId });
}
