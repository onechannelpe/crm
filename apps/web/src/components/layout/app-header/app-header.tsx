import { useLocation } from "@solidjs/router";
import { createMemo } from "solid-js";

import LayoutSidebarRightCollapse from "~/components/icons/layout-sidebar-right-collapse";
import { ICON_BY_ROUTE } from "~/components/layout/route-icons";
import { useNavigationDrawerState } from "~/features/navigation-drawer/state/navigation-drawer-provider";
import { PageHeader } from "~/features/settings-shell/page/page-header";
import { getHeaderRoute } from "~/lib/nav/policy";

import { AppHeaderActions } from "./app-header-actions";

import styles from "./app-header.module.css";

export function AppHeader() {
  const location = useLocation();
  const currentRoute = createMemo(() => getHeaderRoute(location.pathname));
  const { expanded, isMobile, setExpanded } = useNavigationDrawerState();

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
      <AppHeaderActions />
    </PageHeader>
  );
}
