import { A, createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";

import { listLeadsForQuotation } from "~/actions/pipeline/quotations";
import { AppPage } from "~/components/layout/page";

export default function QuotationsPage() {
  const leads = createAsync(() => listLeadsForQuotation({}), {
    initialValue: [],
  });

  return (
    <AppPage>
      <div style={{ padding: "1.5rem" }}>
        <h1 style={{ margin: "0 0 1rem", "font-size": "1.25rem" }}>
          Cotizaciones
        </h1>
        <Show when={leads().length === 0}>
          <p style={{ color: "#6b7280" }}>No hay leads listos para cotizar.</p>
        </Show>
        <div
          style={{ display: "flex", "flex-direction": "column", gap: "0.5rem" }}
        >
          <For each={leads()}>
            {(lead) => (
              <A
                href={`/quotations/${lead.id}`}
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
                      {lead.ruc}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        "font-size": "0.875rem",
                        color: "#6b7280",
                      }}
                    >
                      {lead.razon_social ?? "—"}
                    </p>
                  </div>
                  <span
                    style={{
                      "font-size": "0.75rem",
                      padding: "0.25rem 0.5rem",
                      background: "#fef3c7",
                      color: "#92400e",
                      "border-radius": "0.25rem",
                    }}
                  >
                    {lead.stage}
                  </span>
                </div>
              </A>
            )}
          </For>
        </div>
      </div>
    </AppPage>
  );
}
