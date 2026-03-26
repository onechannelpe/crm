import { A, createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";

import { listLeadsForReview } from "~/actions/pipeline/review";
import { AppPage } from "~/components/layout/page";

export default function ReviewQueuePage() {
  const leads = createAsync(
    () => listLeadsForReview({ stage: "PENDING_EXTERNAL_REVIEW" }),
    { initialValue: [] },
  );

  return (
    <AppPage>
      <div style={{ padding: "1.5rem" }}>
        <h1 style={{ margin: "0 0 1rem", "font-size": "1.25rem" }}>
          Cola de Revision
        </h1>
        <Show when={leads().length === 0}>
          <p style={{ color: "#6b7280" }}>
            No hay leads pendientes de revision.
          </p>
        </Show>
        <div
          style={{ display: "flex", "flex-direction": "column", gap: "0.5rem" }}
        >
          <For each={leads()}>
            {(lead) => (
              <A
                href={`/review/${lead.id}`}
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
                  <div
                    style={{
                      "text-align": "right",
                      "font-size": "0.75rem",
                      color: "#6b7280",
                    }}
                  >
                    <p style={{ margin: 0 }}>Estado: {lead.status ?? "—"}</p>
                    <p style={{ margin: 0 }}>
                      Prioridad: {lead.prioridad ?? "—"}
                    </p>
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
