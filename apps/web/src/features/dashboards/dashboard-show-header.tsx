import { A } from "@solidjs/router";
import { type ParentProps } from "solid-js";

import LayoutDashboard from "~/components/icons/layout-dashboard";
import LayoutSidebarRightCollapse from "~/components/icons/layout-sidebar-right-collapse";
import { useNavigationDrawerState } from "~/features/navigation-drawer/state/navigation-drawer-provider";
import { PageHeader } from "~/features/settings-shell/page/page-header";

import styles from "./dashboard-show-header.module.css";

export function DashboardShowHeader(props: ParentProps<{ title: string }>) {
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
      title={
        <span class={styles.breadcrumb}>
          <A href="/dashboards" class={styles.breadcrumbLink}>
            <span class={styles.breadcrumbPrefix}>
              <span class={styles.objectIconBadge}>
                <LayoutDashboard size={14} />
              </span>
              <span>Paneles</span>
            </span>
          </A>
          <span class={styles.breadcrumbSep}>/</span>
          <span class={styles.breadcrumbCurrent} title={props.title}>
            {props.title}
          </span>
        </span>
      }
    >
      {props.children}
    </PageHeader>
  );
}
