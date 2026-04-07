import { createMemo, For } from "solid-js";

import { SidePanelList } from "../../components/list";
import { useSidePanelPageInstanceId } from "../../state/page-instance";
import { useSidePanel } from "../../state/use-side-panel";

export function DataGridDetailPage() {
  const pageId = useSidePanelPageInstanceId();
  const { getPageState } = useSidePanel();

  const pageState = createMemo(() => {
    const state = getPageState(pageId());

    if (!state || state.page !== "data-grid-detail") {
      throw new Error(
        "Data grid detail side panel page state is not available",
      );
    }

    return state;
  });

  return (
    <SidePanelList>
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
    </SidePanelList>
  );
}
