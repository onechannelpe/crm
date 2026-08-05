import { For, Show } from "solid-js";

import { FieldEmptyValue } from "~/features/widgets/field-table";

import { SidePanelPage } from "../../components/page";
import { useSidePanelPageState } from "../../router/page-state";

export function DataGridDetailPage() {
  const pageState = useSidePanelPageState("data-grid-detail");

  return (
    <SidePanelPage>
      <div style={{ display: "grid", gap: "12px" }}>
        <For each={pageState().items}>
          {(item) => (
            <section>
              <div
                style={{
                  color: "var(--foreground-secondary)",
                  "font-size": "12px",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  "font-size": "14px",
                  "white-space": "pre-wrap",
                  "word-break": "break-word",
                }}
              >
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
