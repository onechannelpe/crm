import { For } from "solid-js";

import Users from "~/components/icons/users";
import { RecordChipList } from "~/components/ui/record-chip/record-chip";

import { PanelList } from "../../components/list";
import { useSidePanelPageState } from "../../state/page-frame";

import styles from "./page.module.css";

export function SearchCompanyPage() {
  const pageState = useSidePanelPageState("search-company-detail");

  return (
    <PanelList>
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
    </PanelList>
  );
}
