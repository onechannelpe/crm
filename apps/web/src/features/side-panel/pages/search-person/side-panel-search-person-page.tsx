import { createMemo, For } from "solid-js";

import User from "~/components/icons/user";
import { ResultPills } from "~/features/search/ui/result-pills";

import { SidePanelList } from "../../components/side-panel-list";
import { useSidePanelPageInstanceId } from "../../state/side-panel-page-instance";
import { useSidePanel } from "../../state/use-side-panel";

import styles from "./side-panel-search-person-page.module.css";

export function SidePanelSearchPersonPage() {
  const pageId = useSidePanelPageInstanceId();
  const { getPageState } = useSidePanel();

  const pageState = createMemo(() => {
    const state = getPageState(pageId());

    if (!state || state.page !== "search-person-detail") {
      throw new Error("Search person side panel page state is not available");
    }

    return state;
  });

  return (
    <SidePanelList>
      <div class={styles.content}>
        <section class={styles.hero}>
          <div class={styles.heroIcon}>
            <User size={16} />
          </div>
          <div class={styles.heroText}>
            <div class={styles.title}>{pageState().person.displayName}</div>
            <div class={styles.subtitle}>DNI {pageState().person.dni}</div>
          </div>
        </section>

        <section class={styles.section}>
          <div class={styles.sectionTitle}>Aliases</div>
          <ResultPills items={pageState().person.aliases} />
        </section>

        <section class={styles.section}>
          <div class={styles.sectionTitle}>Phones</div>
          <ResultPills items={pageState().person.phones} />
        </section>

        <section class={styles.section}>
          <div class={styles.sectionTitle}>Companies</div>
          <div class={styles.list}>
            <For each={pageState().person.companies}>
              {(company) => (
                <div class={styles.row}>
                  <div class={styles.rowTitle}>
                    {company.name ?? "Unknown company"}
                  </div>
                  <div class={styles.rowMeta}>{company.ruc ?? "-"}</div>
                </div>
              )}
            </For>
          </div>
        </section>
      </div>
    </SidePanelList>
  );
}
