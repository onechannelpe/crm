import { Show } from "solid-js";

import { ExtensionStatusIndicator } from "~/components/features/extension/extension-status-indicator";
import { TopBarCommandButton } from "~/components/layout/top-bar-command-button";
import { HeaderNotificationsPanel } from "~/features/notifications/ui/header-notifications-panel";
import { PAGE_HEADER_SIDE_PANEL_BUTTON_CLICK_OUTSIDE_ID } from "~/features/side-panel/constants/side-panel-click-outside-id";
import { focusExtensionWindow } from "~/lib/extension/runtime";

import { useAppHeaderSidePanel } from "./use-app-header-side-panel";

export function AppHeaderActions() {
  const {
    modKey,
    isSidePanelOpen,
    extensionState,
    extensionErrorMessage,
    isExtensionAvailable,
    toggleSidePanel,
  } = useAppHeaderSidePanel();

  return (
    <>
      <Show when={isExtensionAvailable()}>
        <ExtensionStatusIndicator
          extensionState={extensionState}
          extensionErrorMessage={extensionErrorMessage}
          onOpen={focusExtensionWindow}
        />
      </Show>
      <HeaderNotificationsPanel />
      <TopBarCommandButton
        isOpen={isSidePanelOpen()}
        modKey={modKey()}
        onClick={toggleSidePanel}
        dataClickOutsideId={PAGE_HEADER_SIDE_PANEL_BUTTON_CLICK_OUTSIDE_ID}
      />
    </>
  );
}
