import { createAsync, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";

import { getImportJob } from "~/actions/pipeline/imports";
import { AppPage } from "~/components/layout/page";

export default function ImportJobDetailPage() {
  const params = useParams<{ jobId: string }>();
  const job = createAsync(() => getImportJob(Number(params.jobId)));

  const results = () => {
    const j = job();
    if (!j?.results_json) return null;
    try {
      // eslint-disable-next-line no-unsafe-type-assertion
      return JSON.parse(j.results_json) as Array<{
        row: number;
        ok: boolean;
        reason?: string;
      }>;
    } catch {
      return null;
    }
  };

  return (
    <AppPage>
      <Show
        when={job()}
        fallback={<p style={{ padding: "1.5rem" }}>Cargando...</p>}
      >
        {(j) => (
          <div style={{ padding: "1.5rem" }}>
            <h1 style={{ margin: "0 0 1rem", "font-size": "1.25rem" }}>
              Importacion #{j().id} — {j().type}
            </h1>
            <dl
              style={{
                display: "grid",
                "grid-template-columns": "auto 1fr",
                gap: "0.25rem 1rem",
                "margin-bottom": "1.5rem",
              }}
            >
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                Estado
              </dt>
              <dd style={{ margin: 0 }}>{j().status}</dd>
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                Total filas
              </dt>
              <dd style={{ margin: 0 }}>{j().rows_total ?? "—"}</dd>
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                Aplicadas
              </dt>
              <dd style={{ margin: 0, color: "#16a34a" }}>
                {j().rows_applied ?? "—"}
              </dd>
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                Fallidas
              </dt>
              <dd style={{ margin: 0, color: "#dc2626" }}>
                {j().rows_failed ?? "—"}
              </dd>
              <Show when={j().error_message}>
                <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                  Error
                </dt>
                <dd style={{ margin: 0, color: "#dc2626" }}>
                  {j().error_message}
                </dd>
              </Show>
            </dl>

            <Show when={results()}>
              {(rows) => (
                <div>
                  <h2 style={{ margin: "0 0 0.75rem", "font-size": "1rem" }}>
                    Resultados por fila
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      "flex-direction": "column",
                      gap: "0.25rem",
                    }}
                  >
                    <For each={rows().filter((r) => !r.ok)}>
                      {(r) => (
                        <div
                          style={{
                            display: "flex",
                            gap: "0.75rem",
                            padding: "0.5rem 0.75rem",
                            background: "#fef2f2",
                            "border-radius": "0.375rem",
                            "font-size": "0.875rem",
                          }}
                        >
                          <span
                            style={{ color: "#dc2626", "font-weight": "600" }}
                          >
                            Fila {r.row}
                          </span>
                          <span style={{ color: "#6b7280" }}>{r.reason}</span>
                        </div>
                      )}
                    </For>
                    <Show when={rows().filter((r) => !r.ok).length === 0}>
                      <p style={{ color: "#16a34a", "font-size": "0.875rem" }}>
                        Todas las filas procesadas correctamente.
                      </p>
                    </Show>
                  </div>
                </div>
              )}
            </Show>
          </div>
        )}
      </Show>
    </AppPage>
  );
}
