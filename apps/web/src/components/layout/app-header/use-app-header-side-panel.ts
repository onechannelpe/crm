import { createSignal, onMount } from "solid-js";

import { SIDE_PANEL_HOTKEY } from "~/features/side-panel/constants/side-panel-hotkey";
import { useSidePanel } from "~/features/side-panel/state/use-side-panel";
import { createRootSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { createExtensionPortConnection } from "~/lib/extension/port";
import { useHotkey } from "~/lib/hotkey/use-hotkey";

export function useAppHeaderSidePanel() {
  const [modKey, setModKey] = createSignal("Ctrl");
  const { isOpen, openPanel, closePanel } = useSidePanel();
  const {
    state: extensionState,
    errorMessage: extensionErrorMessage,
    isAvailable: isExtensionAvailable,
  } = createExtensionPortConnection();

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

  return {
    modKey,
    isSidePanelOpen: isOpen,
    extensionState,
    extensionErrorMessage,
    isExtensionAvailable,
    toggleSidePanel,
  };
}
