import { createMemo } from "solid-js";

import { SidePanelList } from "../../components/side-panel-list";
import { useSidePanelPageInstanceId } from "../../state/side-panel-page-instance";
import { useSidePanel } from "../../state/use-side-panel";

export function InventoryDetailPage() {
  const pageId = useSidePanelPageInstanceId();
  const { getPageState } = useSidePanel();

  const pageState = createMemo(() => {
    const state = getPageState(pageId());

    if (!state || state.page !== "inventory-detail") {
      throw new Error(
        "Inventory detail side panel page state is not available",
      );
    }

    return state;
  });

  return (
    <SidePanelList>
      <div style={{ display: "grid", gap: "12px" }}>
        <section>
          <div
            style={{
              color: "var(--foreground-secondary)",
              "font-size": "12px",
            }}
          >
            Producto
          </div>
          <div style={{ "font-size": "14px", "font-weight": "600" }}>
            {pageState().productName}
          </div>
        </section>
        <section>
          <div
            style={{
              color: "var(--foreground-secondary)",
              "font-size": "12px",
            }}
          >
            Número de serie
          </div>
          <div
            style={{
              "font-family": "var(--font-mono)",
              "font-size": "13px",
            }}
          >
            {pageState().serialNumber}
          </div>
        </section>
        <section>
          <div
            style={{
              color: "var(--foreground-secondary)",
              "font-size": "12px",
            }}
          >
            Categoría
          </div>
          <div style={{ "font-size": "14px" }}>{pageState().category}</div>
        </section>
        <section>
          <div
            style={{
              color: "var(--foreground-secondary)",
              "font-size": "12px",
            }}
          >
            Estado
          </div>
          <div style={{ "font-size": "14px" }}>{pageState().status}</div>
        </section>
        <section>
          <div
            style={{
              color: "var(--foreground-secondary)",
              "font-size": "12px",
            }}
          >
            Creado
          </div>
          <div style={{ "font-size": "14px" }}>
            {new Date(pageState().createdAt).toLocaleString()}
          </div>
        </section>
      </div>
    </SidePanelList>
  );
}
