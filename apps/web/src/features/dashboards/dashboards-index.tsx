import { useNavigate } from "@solidjs/router";
import { Dynamic } from "solid-js/web";

import Info from "~/components/icons/info";
import LayoutDashboard from "~/components/icons/layout-dashboard";
import { AppHeaderActions } from "~/components/layout/app-header/app-header-actions";
import { ICON_BY_ROUTE } from "~/components/layout/route-icons";
import { TintedIconTile } from "~/components/ui/display/tinted-icon-tile/tinted-icon-tile";
import { PageCardHeader } from "~/components/ui/layout/page-card/page-card-header";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";

import { DASHBOARDS, type DashboardDescriptor } from "./registry";

import styles from "./dashboards-index.module.css";

const DASHBOARD_COLUMNS = [
  {
    key: "title",
    label: "Título",
    icon: LayoutDashboard,
    minWidth: 220,
    sticky: true,
    renderCell: (dashboard) => (
      <span class={styles.chip}>
        <span class={styles.chipIcon}>
          <Dynamic component={ICON_BY_ROUTE[dashboard.icon]} size={14} />
        </span>
        <span class={styles.chipLabel}>{dashboard.title}</span>
      </span>
    ),
  },
  {
    key: "description",
    label: "Descripción",
    icon: Info,
    minWidth: 320,
    grow: true,
    renderCell: (dashboard) => (
      <span class={styles.description}>{dashboard.description}</span>
    ),
  },
] satisfies ReadonlyArray<DataGridColumn<DashboardDescriptor>>;

export function DashboardsIndex() {
  const navigate = useNavigate();

  return (
    <div class={styles.page}>
      <PageCardHeader
        icon={<TintedIconTile Icon={ICON_BY_ROUTE.dashboards} color="blue" />}
        title="Paneles"
        actionButton={<AppHeaderActions />}
      />
      <DataGrid
        ariaLabel="Paneles"
        columns={DASHBOARD_COLUMNS}
        emptyState="No hay paneles disponibles."
        onRowOpen={(dashboard) => navigate(`/dashboards/${dashboard.id}`)}
        rowId={(row) => row.id}
        rowOpenIndicator="route"
        source={{ status: "ready", rows: DASHBOARDS }}
      />
    </div>
  );
}
