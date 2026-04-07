import { createMemo, For } from "solid-js";

import Users from "~/components/icons/users";
import { RecordChipList } from "~/components/ui/record-chip/record-chip";

import { SidePanelList } from "../../components/side-panel-list";
import { useSidePanelPageInstanceId } from "../../state/side-panel-page-instance";
import { useSidePanel } from "../../state/use-side-panel";

import styles from "./page.module.css";

export function SidePanelSearchCompanyPage() {
  const pageId = useSidePanelPageInstanceId();
  const { getPageState } = useSidePanel();

  const pageState = createMemo(() => {
    const state = getPageState(pageId());

    if (!state || state.page !== "search-company-detail") {
      throw new Error("Search company side panel page state is not available");
    }

    return state;
  });

  return (
    <SidePanelList>
      <div class={styles.content}>
        <section class={styles.hero}>
          <div class={styles.heroIcon}>
            <Users size={16} />
          </div>
          <div class={styles.heroText}>
            <div class={styles.title}>
              {pageState().company.name ?? "Unknown company"}
            </div>
            <div class={styles.subtitle}>
              RUC {pageState().company.ruc ?? "-"}
            </div>
          </div>
        </section>

        <section class={styles.section}>
          <div class={styles.sectionTitle}>People</div>
          <div class={styles.list}>
            <For each={pageState().company.people}>
              {(person) => (
                <div class={styles.row}>
                  <div class={styles.rowTitle}>{person.name}</div>
                  <div class={styles.rowMeta}>{person.dni}</div>
                </div>
              )}
            </For>
          </div>
        </section>

        <section class={styles.section}>
          <div class={styles.sectionTitle}>Phones</div>
          <RecordChipList items={pageState().company.phones} shape="square" />
        </section>

        <section class={styles.section}>
          <div class={styles.sectionTitle}>Emails</div>
          <RecordChipList items={pageState().company.emails} shape="square" />
        </section>
      </div>
    </SidePanelList>
  );
}
