import type {
  SidePanelNavigationEntry,
  SidePanelPageDefinition,
} from "../types/side-panel-page";
import type { SidePanelState } from "../types/side-panel-state";

export function selectCurrentFrame(
  state: SidePanelState,
): SidePanelPageDefinition | null {
  return state.stack.at(-1) ?? null;
}

export function selectCurrentEntry(
  state: SidePanelState,
): SidePanelNavigationEntry | null {
  return selectCurrentFrame(state)?.entry ?? null;
}

export function selectNavigationStack(
  state: SidePanelState,
): SidePanelNavigationEntry[] {
  return state.stack.map((frame) => frame.entry);
}
