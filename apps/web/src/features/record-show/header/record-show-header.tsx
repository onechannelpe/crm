import { A, createAsync } from "@solidjs/router";
import { createMemo } from "solid-js";

import LayoutSidebarRightCollapse from "~/components/icons/layout-sidebar-right-collapse";
import { useNavigationDrawerState } from "~/features/navigation-drawer/state/navigation-drawer-provider";
import { leadDetailQuery } from "~/features/pipeline/data/queries";
import { PageHeader } from "~/features/settings-shell/page/page-header";

import styles from "./record-show-header.module.css";

type RecordShowHeaderProps = { leadId: number };

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
          <A href="/leads" class={styles.breadcrumbLink}>
            Prospectos
          </A>
          <span class={styles.breadcrumbSep}>/</span>
          <span class={styles.breadcrumbCurrent}>{displayName()}</span>
        </span>
      }
    />
  );
}
