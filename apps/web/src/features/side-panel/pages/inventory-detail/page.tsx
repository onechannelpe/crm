import { PanelList } from "../../components/list";
import { useSidePanelPageState } from "../../state/page-frame";

export function InventoryDetailPage() {
  const pageState = useSidePanelPageState("inventory-detail");

  return (
    <PanelList>
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
    </PanelList>
  );
}
