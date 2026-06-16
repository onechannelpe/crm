import type { EventToAppend } from "~/server/shared/repos-events";

import type { LeadHistoryEventDraft } from "../domain/history";

/**
 * Single owner of how a lead history draft becomes a row on the events spine.
 * Every lead writer (registration effects, the unit of work, and the CSV import
 * path) emits through this so the `entity_type`/`entity_id`/`type` tagging stays
 * consistent across the activity feed and audit projections.
 */
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
