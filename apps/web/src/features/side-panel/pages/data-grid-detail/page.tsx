import { createMemo, For } from "solid-js";

import { PanelList } from "../../components/list";
import { usePageInstanceId } from "../../state/page-instance";
import { useSidePanel } from "../../state/use-side-panel";

export function DataGridDetailPage() {
  const pageId = usePageInstanceId();
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
