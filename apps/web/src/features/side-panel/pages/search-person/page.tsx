import { For } from "solid-js";

import User from "~/components/icons/user";
import { RecordChipList } from "~/components/ui/record-chip/record-chip";

import { PanelList } from "../../components/list";
import { useSidePanelPageState } from "../../router/page-state";

import styles from "./page.module.css";

export function SearchPersonPage() {
  const pageState = useSidePanelPageState("search-person-detail");

  return (
    <PanelList>
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
          <div class={styles.sectionTitle}>Alias</div>
          <RecordChipList items={pageState().person.aliases} shape="round" />
        </section>

        <section class={styles.section}>
          <div class={styles.sectionTitle}>Teléfonos</div>
          <RecordChipList items={pageState().person.phones} shape="square" />
        </section>

        <section class={styles.section}>
          <div class={styles.sectionTitle}>Empresas</div>
          <div class={styles.list}>
            <For each={pageState().person.companies}>
              {(company) => (
                <div class={styles.row}>
                  <div class={styles.rowTitle}>
                    {company.name ?? "Empresa desconocida"}
                  </div>
                  <div class={styles.rowMeta}>{company.ruc ?? "-"}</div>
                </div>
              )}
            </For>
          </div>
        </section>
      </div>
    </PanelList>
  );
}
