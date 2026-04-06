import { createAsync, useNavigate } from "@solidjs/router";
import { createSignal, For } from "solid-js";

import {
  downloadExport,
  queueLeadExport,
} from "~/actions/integrations/exports";
import { listIntegrationJobs } from "~/actions/integrations/imports";
import { AppPage } from "~/components/layout/page";
import { toAppError } from "~/lib/app-errors";

export default function ExportsPage() {
  const navigate = useNavigate();
  const jobs = createAsync(() => listIntegrationJobs({ limit: 20 }), {
    initialValue: [],
  });
  const [error, setError] = createSignal<string | null>(null);
  const [queuing, setQueuing] = createSignal(false);

  async function handleQueue() {
    setError(null);
    setQueuing(true);
    try {
      await queueLeadExport();
      navigate("/integrations/exports");
    } catch (err) {
      setError(toAppError(err, "Error al encolar exportacion").publicMessage);
    } finally {
      setQueuing(false);
    }
  }

  async function handleDownload(jobId: number) {
    try {
      const bytes = await downloadExport(jobId);
      // eslint-disable-next-line no-unsafe-type-assertion
      const blob = new Blob([bytes.buffer as ArrayBuffer], {
        type: "text/csv",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-export-${jobId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(toAppError(err, "Error al descargar").publicMessage);
    }
  }

  const exportJobs = () => jobs().filter((j) => j.type === "export");

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
          <h1 style={{ margin: 0, "font-size": "1.25rem" }}>
            Exportaciones de Leads
          </h1>
          <button
            onClick={() => void handleQueue()}
            disabled={queuing()}
            style={{
              padding: "0.5rem 1rem",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              "border-radius": "0.375rem",
              cursor: "pointer",
              "font-size": "0.875rem",
            }}
          >
            {queuing() ? "..." : "Nueva Exportacion"}
          </button>
        </div>

        {error() && (
          <p
            style={{
              color: "#dc2626",
              "font-size": "0.875rem",
              "margin-bottom": "1rem",
            }}
          >
            {error()}
          </p>
        )}

        <div
          style={{ display: "flex", "flex-direction": "column", gap: "0.5rem" }}
        >
          <For each={exportJobs()}>
            {(job) => (
              <div
                style={{
                  display: "flex",
                  "justify-content": "space-between",
                  "align-items": "center",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e5e7eb",
                  "border-radius": "0.5rem",
                  background: "#fff",
                }}
              >
                <div>
                  <p style={{ margin: 0, "font-size": "0.875rem" }}>
                    Job #{job.id}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      "font-size": "0.75rem",
                      color: "#6b7280",
                    }}
                  >
                    {new Date(job.created_at).toLocaleString()}
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    "align-items": "center",
                    gap: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      "font-size": "0.75rem",
                      padding: "0.25rem 0.5rem",
                      background:
                        job.status === "COMPLETED"
                          ? "#d1fae5"
                          : job.status === "FAILED"
                            ? "#fee2e2"
                            : "#fef3c7",
                      "border-radius": "0.25rem",
                    }}
                  >
                    {job.status}
                  </span>
                  {job.status === "COMPLETED" && (
                    <button
                      onClick={() => void handleDownload(job.id)}
                      style={{
                        padding: "0.25rem 0.75rem",
                        background: "#f3f4f6",
                        border: "1px solid #d1d5db",
                        "border-radius": "0.25rem",
                        cursor: "pointer",
                        "font-size": "0.75rem",
                      }}
                    >
                      Descargar
                    </button>
                  )}
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </AppPage>
  );
}
