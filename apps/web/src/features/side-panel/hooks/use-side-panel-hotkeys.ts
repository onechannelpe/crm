import { useHotkey } from "~/browser/hotkey/use-hotkey";

import {
  SEARCH_RECORDS_HOTKEY,
  SIDE_PANEL_HOTKEY,
} from "../constants/side-panel-hotkey";
import { useSidePanelMenu } from "./use-side-panel-menu";

// Register once per panel. Multiple registrations can toggle it twice.
export function useSidePanelHotkeys() {
  const { toggleSidePanelMenu, openSearchRecordsPage } = useSidePanelMenu();

  // Keep the toggle available after the panel moves focus into an input.
  useHotkey(SIDE_PANEL_HOTKEY, toggleSidePanelMenu, { allowInInputs: true });

  useHotkey(SEARCH_RECORDS_HOTKEY, openSearchRecordsPage, {
    ignoreModifiers: true,
  });
}
