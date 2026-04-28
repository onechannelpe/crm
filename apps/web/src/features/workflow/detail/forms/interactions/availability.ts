import type { LeadAvailableAction } from "~/server/workflow/application/contracts/lead-available-action";

import type { InteractionMode } from "./state";

const INTERACTION_MODES = ["call", "note"] as const;

export interface InteractionAvailability {
  visibleModes: readonly InteractionMode[];
}

export function deriveInteractionAvailability(
  availableActions: readonly LeadAvailableAction[],
): InteractionAvailability {
  const canLogCall = availableActions.includes("log-call");
  const canAddNote = availableActions.includes("add-note");
  const visibleModes = INTERACTION_MODES.filter((value) =>
    value === "call" ? canLogCall : canAddNote,
  );

  return {
    visibleModes,
  };
}

export function hasInteractionMode(
  availability: InteractionAvailability,
  mode: InteractionMode,
): boolean {
  return availability.visibleModes.includes(mode);
}

export function resolveInteractionMode(
  availability: InteractionAvailability,
  currentMode: InteractionMode,
): InteractionMode | null {
  if (availability.visibleModes.length === 0) {
    return null;
  }
  if (availability.visibleModes.includes(currentMode)) {
    return currentMode;
  }
  return availability.visibleModes[0];
}
