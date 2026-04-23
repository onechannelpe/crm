import { A, createAsync } from "@solidjs/router";
import { createMemo } from "solid-js";

import LayoutSidebarRightCollapse from "~/components/icons/layout-sidebar-right-collapse";
import { useNavigationDrawerState } from "~/features/navigation-drawer/state/navigation-drawer-provider";
import { PageHeader } from "~/features/settings-shell/page/page-header";
import { leadDetailQuery } from "~/features/workflow/data/queries";

import styles from "./record-show-header.module.css";

type RecordShowHeaderProps = { leadId: string };

export function RecordShowHeader(props: RecordShowHeaderProps) {
  const { expanded, isMobile, setExpanded } = useNavigationDrawerState();
  const data = createAsync(() => leadDetailQuery(props.leadId));
  const displayName = createMemo(
    () => data()?.lead.razonSocial ?? data()?.lead.ruc ?? "—",
  );

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
          <A href="/records" class={styles.breadcrumbLink}>
            Registros
          </A>
          <span class={styles.breadcrumbSep}>/</span>
          <span class={styles.breadcrumbCurrent}>{displayName()}</span>
        </span>
      }
    />
  );
}
