import type { LeadEvent } from "./events";
import type { LeadState } from "./state";

export function applyEvent(state: LeadState, event: LeadEvent): LeadState {
  switch (event.eventType) {
    case "lead_reviewed":
      return {
        ...state,
        stage: event.payload.toStage,
        status: event.payload.status,
        prioridad: event.payload.prioridad,
      };
    case "workflow_stage_changed":
      return { ...state, stage: event.payload.to };
    case "lead_reassigned":
      return { ...state, executiveId: event.payload.toExecutiveId };
    case "lead_status_updated":
      return { ...state, status: event.payload.toStatus };
    case "lead_priority_updated":
      return { ...state, prioridad: event.payload.toPrioridad };
    case "lead_reservation_expired":
      return { ...state, stage: "EXPIRED" };
    default:
      return state;
  }
}

export function applyEvents(
  state: LeadState,
  events: LeadEvent[],
  meta: { actorUserId: number | null; now: number },
): LeadState {
  const next = events.reduce(applyEvent, state);
  return {
    ...next,
    updatedBy: meta.actorUserId,
    updatedAt: meta.now,
    version: state.version + 1,
  };
}
