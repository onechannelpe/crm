import { useModKeyLabel } from "~/browser/hotkey/use-mod-key-label";
import { createExtensionPortConnection } from "~/features/extension/port";
import { useSidePanelMenu } from "~/features/side-panel/hooks/use-side-panel-menu";

export function useAppHeaderSidePanel() {
  const { isSidePanelOpen, toggleSidePanelMenu } = useSidePanelMenu();
  const {
    state: extensionState,
    errorMessage: extensionErrorMessage,
    isAvailable: isExtensionAvailable,
  } = createExtensionPortConnection();

  return {
    modKey: useModKeyLabel(),
    isSidePanelOpen,
    extensionState,
    extensionErrorMessage,
    isExtensionAvailable,
    toggleSidePanel: toggleSidePanelMenu,
  };
}
