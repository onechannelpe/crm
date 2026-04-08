import { For } from "solid-js";

import { PanelList } from "../../components/list";
import { useSidePanelPageState } from "../../state/page-frame";

export function DataGridDetailPage() {
  const pageState = useSidePanelPageState("data-grid-detail");

  return (
    <PanelList>
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
    </PanelList>
  );
}
