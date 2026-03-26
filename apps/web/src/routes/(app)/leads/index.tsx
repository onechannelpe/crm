import { A, createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";

import { listLeads } from "~/actions/pipeline/leads";
import { AppPage } from "~/components/layout/page";

export default function LeadsPage() {
  const leads = createAsync(() => listLeads({}), { initialValue: [] });

  return (
    <AppPage>
      <div style={{ padding: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            "justify-content": "space-between",
            "align-items": "center",
            "margin-bottom": "1rem",
          }}
        >
          <h1 style={{ margin: 0, "font-size": "1.25rem" }}>Leads</h1>
          <A
            href="/leads/new"
            style={{
              "background-color": "#2563eb",
              color: "#fff",
              padding: "0.5rem 1rem",
              "border-radius": "0.375rem",
              "text-decoration": "none",
              "font-size": "0.875rem",
            }}
          >
            Registrar Lead
          </A>
        </div>
        <Show when={leads().length === 0}>
          <p style={{ color: "#6b7280" }}>No hay leads registrados.</p>
        </Show>
        <div
          style={{ display: "flex", "flex-direction": "column", gap: "0.5rem" }}
        >
          <For each={leads()}>
            {(lead) => (
              <A
                href={`/leads/${lead.id}`}
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
                  <div style={{ "text-align": "right" }}>
                    <span
                      style={{
                        "font-size": "0.75rem",
                        padding: "0.25rem 0.5rem",
                        background: "#f3f4f6",
                        "border-radius": "0.25rem",
                      }}
                    >
                      {lead.stage}
                    </span>
                    <Show when={lead.status}>
                      <p
                        style={{
                          margin: "0.25rem 0 0",
                          "font-size": "0.75rem",
                          color: "#6b7280",
                        }}
                      >
                        {lead.status}
                      </p>
                    </Show>
                  </div>
                </div>
              </A>
            )}
          </For>
        </div>
      </div>
    </AppPage>
  );
}
