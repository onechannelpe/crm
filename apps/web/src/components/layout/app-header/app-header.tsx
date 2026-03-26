import { useLocation } from "@solidjs/router";
import { createMemo } from "solid-js";

import { ExtensionStatusIndicator } from "~/components/features/extension/extension-status-indicator";
import LayoutSidebarRightCollapse from "~/components/icons/layout-sidebar-right-collapse";
import { HeaderNotificationsPanel } from "~/components/layout/header-notifications-panel";
import { ICON_BY_ROUTE } from "~/components/layout/route-icons";
import { TopBarCommandButton } from "~/components/layout/top-bar-command-button";
import { useNavigationDrawerState } from "~/features/navigation-drawer/state/navigation-drawer-state";
import { PageHeader } from "~/features/settings-shell";
import { getHeaderRoute } from "~/lib/nav/nav-policy";

import styles from "./app-header.module.css";
import { useAppHeaderSidePanel } from "./use-app-header-side-panel";

export function AppHeader() {
  const location = useLocation();
  const currentRoute = createMemo(() => getHeaderRoute(location.pathname));
  const { expanded, isMobile, setExpanded } = useNavigationDrawerState();
  const {
    modKey,
    isSidePanelOpen,
    extensionState,
    extensionError,
    focusExtensionWindow,
    toggleSidePanel,
    commandButtonClickOutsideId,
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
      <ExtensionStatusIndicator
        extensionState={extensionState}
        extensionError={extensionError}
        onOpen={focusExtensionWindow}
      />
      <HeaderNotificationsPanel />
      <TopBarCommandButton
        isOpen={isSidePanelOpen()}
        modKey={modKey()}
        onClick={toggleSidePanel}
        dataClickOutsideId={commandButtonClickOutsideId}
      />
    </PageHeader>
  );
}
