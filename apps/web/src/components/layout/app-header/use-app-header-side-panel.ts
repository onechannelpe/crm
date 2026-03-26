import { createSignal, onMount } from "solid-js";

import { PAGE_HEADER_SIDE_PANEL_BUTTON_CLICK_OUTSIDE_ID } from "~/features/side-panel/constants/side-panel-click-outside-id";
import { SIDE_PANEL_HOTKEY } from "~/features/side-panel/constants/side-panel-hotkey";
import { useSidePanel } from "~/features/side-panel/state/use-side-panel";
import { createRootSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { createExtensionPortConnection } from "~/lib/extension/port";
import { useHotkey } from "~/lib/hotkey/use-hotkey";

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
    const chrome = Reflect.get(globalThis, "chrome");
    if (typeof chrome !== "object" || chrome === null) return;
    const runtime = Reflect.get(chrome, "runtime");
    if (typeof runtime !== "object" || runtime === null) return;
    const send: unknown = Reflect.get(runtime, "sendMessage");
    if (typeof send === "function")
      send.call(runtime, { action: "focusWindow" });
  };

  return {
    modKey,
    isSidePanelOpen: isOpen,
    extensionState,
    extensionError,
    focusExtensionWindow,
    toggleSidePanel,
    commandButtonClickOutsideId: PAGE_HEADER_SIDE_PANEL_BUTTON_CLICK_OUTSIDE_ID,
  };
}
