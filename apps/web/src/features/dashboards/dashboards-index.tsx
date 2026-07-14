import { A } from "@solidjs/router";
import { For } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { ICON_BY_ROUTE } from "~/components/layout/route-icons";
import { TintedIconTile } from "~/components/ui/display/tinted-icon-tile/tinted-icon-tile";

import { DASHBOARDS } from "./registry";

import styles from "./dashboards-index.module.css";

export function DashboardsIndex() {
  return (
    <AppPage>
      <ul class={styles.list}>
        <For each={DASHBOARDS}>
          {(dashboard) => (
            <li>
              <A href={`/dashboards/${dashboard.id}`} class={styles.card}>
                <TintedIconTile
                  Icon={ICON_BY_ROUTE[dashboard.icon]}
                  color="green"
                />
                <div class={styles.text}>
                  <span class={styles.title}>{dashboard.title}</span>
                  <span class={styles.description}>
                    {dashboard.description}
                  </span>
                </div>
              </A>
            </li>
          )}
        </For>
      </ul>
    </AppPage>
  );
}
