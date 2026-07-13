import { For } from "solid-js";

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
                {item.value}
              </div>
            </section>
          )}
        </For>
      </div>
    </SidePanelPage>
  );
}
