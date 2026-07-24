import { A } from "@solidjs/router";
import { type ParentProps } from "solid-js";

import LayoutDashboard from "~/components/icons/layout-dashboard";
import { PageCardHeader } from "~/components/ui/layout/page-card/page-card-header";

import styles from "./dashboard-show-header.module.css";

export function DashboardShowHeader(props: ParentProps<{ title: string }>) {
  return (
    <PageCardHeader
      breadcrumb={
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
      actionButton={props.children}
    />
  );
}
