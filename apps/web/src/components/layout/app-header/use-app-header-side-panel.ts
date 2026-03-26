import { createSignal, onMount } from "solid-js";

import { PAGE_HEADER_SIDE_PANEL_BUTTON_CLICK_OUTSIDE_ID } from "~/features/side-panel/constants/side-panel-click-outside-id";
import { SIDE_PANEL_HOTKEY } from "~/features/side-panel/constants/side-panel-hotkey";
import { useSidePanel } from "~/features/side-panel/state/use-side-panel";
import { createRootSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { createExtensionPortConnection } from "~/lib/extension/port";
import { useHotkey } from "~/lib/hotkey/use-hotkey";

interface ChromeRuntime {
  sendMessage: (message: unknown, callback?: () => void) => void;
}

export function useAppHeaderSidePanel() {
  const [modKey, setModKey] = createSignal("Ctrl");
  const { isOpen, openPanel, closePanel } = useSidePanel();
  const { state: extensionState, error: extensionError } =
    createExtensionPortConnection();

  onMount(() => {
    if (/Mac/i.test(navigator.platform)) {
      setModKey("⌘");
    }
  });

  const toggleSidePanel = () => {
    if (isOpen()) {
      closePanel();
      return;
    }

    openPanel(createRootSidePanelPage());
  };

  useHotkey(SIDE_PANEL_HOTKEY, toggleSidePanel);

  const focusExtensionWindow = () => {
    const runtime =
      (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;

    runtime?.sendMessage?.({ action: "focusWindow" }, () => {});
  };

  return {
    modKey,
    isSidePanelOpen: isOpen,
    extensionState,
    extensionError,
    focusExtensionWindow,
    toggleSidePanel,
    commandButtonClickOutsideId:
      PAGE_HEADER_SIDE_PANEL_BUTTON_CLICK_OUTSIDE_ID,
  };
}
