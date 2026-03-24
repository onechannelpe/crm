import { useLocation } from "@solidjs/router";
import { createMemo, createSignal, onMount } from "solid-js";

import { ExtensionStatusIndicator } from "~/components/features/extension/extension-status-indicator";
import LayoutSidebarRightCollapse from "~/components/icons/layout-sidebar-right-collapse";
import { HeaderNotificationsPanel } from "~/components/layout/header-notifications-panel";
import { ICON_BY_ROUTE } from "~/components/layout/route-icons";
import { TopBarCommandButton } from "~/components/layout/top-bar-command-button";
import { useNavigationDrawerState } from "~/features/navigation-drawer";
import { PageHeader } from "~/features/settings-shell";
import { PAGE_HEADER_SIDE_PANEL_BUTTON_CLICK_OUTSIDE_ID } from "~/features/side-panel/constants/side-panel-click-outside-id";
import { SIDE_PANEL_HOTKEY } from "~/features/side-panel/constants/side-panel-hotkey";
import { useSidePanel } from "~/features/side-panel/state/use-side-panel";
import { createRootSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { createExtensionPortConnection } from "~/lib/extension/port";
import { useHotkey } from "~/lib/hotkey/use-hotkey";
import { getHeaderRoute } from "~/lib/nav/nav-policy";

import styles from "./header.module.css";

interface ChromeRuntime {
  sendMessage: (message: unknown, callback?: () => void) => void;
}

export function Header() {
  const location = useLocation();
  const currentRoute = createMemo(() => getHeaderRoute(location.pathname));
  const [modKey, setModKey] = createSignal("Ctrl");
  const { expanded, isMobile, setExpanded } = useNavigationDrawerState();
  const { isOpen, openPanel, closePanel } = useSidePanel();
  const { state: extensionState, error: extensionError } =
    createExtensionPortConnection();

  onMount(() => {
    if (/Mac/i.test(navigator.platform)) setModKey("⌘");
  });

  const toggleSidePanel = () => {
    if (isOpen()) {
      closePanel();
      return;
    }

    openPanel(createRootSidePanelPage());
  };

  useHotkey(SIDE_PANEL_HOTKEY, toggleSidePanel);

  const handleExtensionIndicatorClick = () => {
    // Focus extension window if available.
    const runtime =
      // eslint-disable-next-line typescript-eslint/no-unsafe-type-assertion
      (globalThis as unknown as { chrome?: { runtime: ChromeRuntime } }).chrome
        ?.runtime;

    if (runtime?.sendMessage) {
      runtime.sendMessage({ action: "focusWindow" }, () => {
        // Callback (ignore errors if extension not ready)
      });
    }
  };

  return (
    <PageHeader
      leading={
        !isMobile() && !expanded() ? (
          <button
            type="button"
            class={styles.drawerExpandButton}
            onClick={() => setExpanded(true)}
            aria-label="Expandir barra lateral"
          >
            <LayoutSidebarRightCollapse size={14} />
          </button>
        ) : undefined
      }
      icon={
        <div class={styles.iconContainer}>
          {(() => {
            const Icon = ICON_BY_ROUTE[currentRoute().icon];
            return <Icon size={16} />;
          })()}
        </div>
      }
      title={<span class={styles.routeLabel}>{currentRoute().label}</span>}
    >
      <ExtensionStatusIndicator
        extensionState={extensionState}
        extensionError={extensionError}
        onOpen={handleExtensionIndicatorClick}
      />
      <HeaderNotificationsPanel />
      <TopBarCommandButton
        isOpen={isOpen()}
        modKey={modKey()}
        onClick={toggleSidePanel}
        dataClickOutsideId={PAGE_HEADER_SIDE_PANEL_BUTTON_CLICK_OUTSIDE_ID}
      />
    </PageHeader>
  );
}
