import { A, useNavigate } from "@solidjs/router";
import { For } from "solid-js";
import { Dynamic } from "solid-js/web";

import { AppHeaderActions } from "~/components/layout/app-header/app-header-actions";
import { ICON_BY_ROUTE } from "~/components/layout/route-icons";
import { TintedIconTile } from "~/components/ui/display/tinted-icon-tile/tinted-icon-tile";
import { PageCardHeader } from "~/components/ui/layout/page-card/page-card-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";

import { DASHBOARDS } from "./registry";

import styles from "./dashboards-index.module.css";

export function DashboardsIndex() {
  const navigate = useNavigate();

  return (
    <div class={styles.page}>
      <PageCardHeader
        icon={<TintedIconTile Icon={ICON_BY_ROUTE.dashboards} color="blue" />}
        title="Paneles"
        actionButton={<AppHeaderActions />}
      />
      <div class={styles.body}>
        <Table variant="list">
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Descripción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <For each={DASHBOARDS}>
              {(dashboard) => (
                <TableRow
                  clickable
                  onClick={() => navigate(`/dashboards/${dashboard.id}`)}
                >
                  <TableCell>
                    <A
                      href={`/dashboards/${dashboard.id}`}
                      class={styles.chip}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <span class={styles.chipIcon}>
                        <Dynamic
                          component={ICON_BY_ROUTE[dashboard.icon]}
                          size={14}
                        />
                      </span>
                      <span class={styles.chipLabel}>{dashboard.title}</span>
                    </A>
                  </TableCell>
                  <TableCell ellipsis class={styles.description}>
                    {dashboard.description}
                  </TableCell>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
