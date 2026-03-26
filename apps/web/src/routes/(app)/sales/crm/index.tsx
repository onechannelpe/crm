import { A, createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";

import { listLeadSales } from "~/actions/pipeline/sales";
import { AppPage } from "~/components/layout/page";

export default function LeadSalesPage() {
  const sales = createAsync(() => listLeadSales({}), { initialValue: [] });

  return (
    <AppPage>
      <div style={{ padding: "1.5rem" }}>
        <h1 style={{ margin: "0 0 1rem", "font-size": "1.25rem" }}>
          Ventas CRM
        </h1>
        <Show when={sales().length === 0}>
          <p style={{ color: "#6b7280" }}>No hay ventas registradas.</p>
        </Show>
        <div
          style={{ display: "flex", "flex-direction": "column", gap: "0.5rem" }}
        >
          <For each={sales()}>
            {(sale) => (
              <A
                href={`/sales/${sale.id}`}
                style={{
                  display: "block",
                  padding: "1rem",
                  border: "1px solid #e5e7eb",
                  "border-radius": "0.5rem",
                  "text-decoration": "none",
                  color: "inherit",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    "justify-content": "space-between",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, "font-weight": "600" }}>
                      Venta #{sale.id}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        "font-size": "0.875rem",
                        color: "#6b7280",
                      }}
                    >
                      {sale.proveedor_actual} — GPV: {sale.gpv}
                    </p>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      "font-size": "0.75rem",
                      color: "#6b7280",
                    }}
                  >
                    {new Date(sale.created_at).toLocaleDateString()}
                  </p>
                </div>
              </A>
            )}
          </For>
        </div>
      </div>
    </AppPage>
  );
}
