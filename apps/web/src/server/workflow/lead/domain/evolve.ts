import type { UserId } from "~/domain/ids";

import type { LeadHistoryEventDraft } from "./history";
import type { LeadState } from "./state";

function applyEvent(state: LeadState, event: LeadHistoryEventDraft): LeadState {
  switch (event.eventType) {
    case "lead_reviewed":
      return {
        ...state,
        stage: event.payload.toStage,
        status: event.payload.status,
        priority: event.payload.priority,
      };
    case "workflow_stage_changed":
      return { ...state, stage: event.payload.to };
    case "lead_reassigned":
      return { ...state, executiveId: event.payload.toExecutiveId };
    case "lead_status_updated":
      return { ...state, status: event.payload.toStatus };
    case "lead_priority_updated":
      return { ...state, priority: event.payload.toPrioridad };
    case "lead_reservation_expired":
      return { ...state, stage: "EXPIRED" };
    case "lead_deleted":
      return { ...state, deletedAt: event.occurredAt };
    default:
      return state;
  }
}

export function applyEvents(
  state: LeadState,
  events: LeadHistoryEventDraft[],
  meta: { actorUserId: UserId | null; now: Date },
): LeadState {
  const next = events.reduce(applyEvent, state);
  return {
    ...next,
    updatedBy: meta.actorUserId,
    updatedAt: meta.now,
    version: state.version + 1,
  };
}
