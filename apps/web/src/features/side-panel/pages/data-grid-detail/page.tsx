import { For, Show } from "solid-js";

import { FieldEmptyValue } from "~/features/widgets/field-table";

import { SidePanelPage } from "../../components/page";
import { useSidePanelPageState } from "../../router/page-state";

import styles from "./data-grid-detail-page.module.css";

export function DataGridDetailPage() {
  const pageState = useSidePanelPageState("data-grid-detail");

  return (
    <SidePanelPage>
      <div class={styles.fields}>
        <For each={pageState().items}>
          {(item) => (
            <section>
              <div class={styles.label}>{item.label}</div>
              <div class={styles.value}>
                <Show
                  when={item.value}
                  fallback={<FieldEmptyValue>{item.label}</FieldEmptyValue>}
                >
                  {(value) => value()}
                </Show>
              </div>
            </section>
          )}
        </For>
      </div>
    </SidePanelPage>
  );
}
