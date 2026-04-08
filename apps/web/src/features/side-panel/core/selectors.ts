import type { SidePanelNavigationEntry } from "../types/side-panel-page";
import type { SidePanelState } from "../types/side-panel-state";

export function selectCurrentEntry(
  state: SidePanelState,
): SidePanelNavigationEntry | null {
  return state.stack.at(-1) ?? null;
}

export function selectNavigationStack(
  state: SidePanelState,
): SidePanelNavigationEntry[] {
  return state.stack;
}
