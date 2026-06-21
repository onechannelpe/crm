import type { EventToAppend } from "~/server/shared/repos-events";
import type { LeadHistoryEventDraft } from "~/server/workflow/lead/domain/history";

export function toLeadEventAppend(draft: LeadHistoryEventDraft): EventToAppend {
  return {
    entityType: "lead",
    entityId: draft.leadId,
    type: draft.eventType,
    actorUserId: draft.actorUserId,
    subjectUserId: draft.subjectUserId,
    payload: draft.payload,
    changes: draft.changes,
    occurredAt: draft.occurredAt,
  };
}
