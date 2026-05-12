import { useLocation } from "@solidjs/router";
import { Show, createMemo } from "solid-js";

import { ExtensionStatusIndicator } from "~/components/features/extension/extension-status-indicator";
import LayoutSidebarRightCollapse from "~/components/icons/layout-sidebar-right-collapse";
import { HeaderNotificationsPanel } from "~/components/layout/header-notifications-panel";
import { ICON_BY_ROUTE } from "~/components/layout/route-icons";
import { TopBarCommandButton } from "~/components/layout/top-bar-command-button";
import { useNavigationDrawerState } from "~/features/navigation-drawer/state/navigation-drawer-provider";
import { PageHeader } from "~/features/settings-shell/page/page-header";
import { PAGE_HEADER_SIDE_PANEL_BUTTON_CLICK_OUTSIDE_ID } from "~/features/side-panel/constants/side-panel-click-outside-id";
import { focusExtensionWindow } from "~/lib/extension/runtime";
import { getHeaderRoute } from "~/lib/nav/policy";

import { useAppHeaderSidePanel } from "./use-app-header-side-panel";

import styles from "./app-header.module.css";

export function AppHeader() {
  const location = useLocation();
  const currentRoute = createMemo(() => getHeaderRoute(location.pathname));
  const { expanded, isMobile, setExpanded } = useNavigationDrawerState();
  const {
    modKey,
    isSidePanelOpen,
    extensionState,
    extensionError,
    isExtensionAvailable,
    toggleSidePanel,
  } = useAppHeaderSidePanel();

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
      <Show when={isExtensionAvailable()}>
        <ExtensionStatusIndicator
          extensionState={extensionState}
          extensionError={extensionError}
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
    </PageHeader>
  );
}
