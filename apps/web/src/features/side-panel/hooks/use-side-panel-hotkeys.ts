import { useHotkey } from "~/browser/hotkey/use-hotkey";

import {
  SEARCH_RECORDS_HOTKEY,
  SIDE_PANEL_HOTKEY,
} from "../constants/side-panel-hotkey";
import { useSidePanelMenu } from "./use-side-panel-menu";

/*
  Registered once, next to the panel itself. Registering per header instead
  double-binds the combo on any page that renders two headers, and the second
  handler then undoes the first (open, then immediately close).
*/
export function useSidePanelHotkeys() {
  const { toggleSidePanelMenu, openSearchRecordsPage } = useSidePanelMenu();

  // The panel takes the caret as soon as it opens, so a combo that stops
  // working inside inputs would stop working the moment the panel is up.
  useHotkey(SIDE_PANEL_HOTKEY, toggleSidePanelMenu, { allowInInputs: true });

  useHotkey(SEARCH_RECORDS_HOTKEY, openSearchRecordsPage, {
    ignoreModifiers: true,
  });
}
