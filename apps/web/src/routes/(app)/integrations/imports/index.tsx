import { A, createAsync, useNavigate } from "@solidjs/router";
import { createSignal, For } from "solid-js";

import {
  listIntegrationJobs,
  uploadImportFile,
} from "~/actions/integrations/imports";
import { AppPage } from "~/components/layout/page";
import { toAppError } from "~/lib/app-errors";

export default function ImportsPage() {
  const navigate = useNavigate();
  const jobs = createAsync(() => listIntegrationJobs({ limit: 20 }), {
    initialValue: [],
  });
  const [error, setError] = createSignal<string | null>(null);
  const [uploading, setUploading] = createSignal(false);

  async function handleUpload(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    setUploading(true);
    if (!(e.currentTarget instanceof HTMLFormElement)) return;
    const formData = new FormData(e.currentTarget);
    try {
      const { jobId } = await uploadImportFile(formData);
      navigate(`/integrations/imports/${jobId}`);
    } catch (err) {
      setError(toAppError(err, "Error al subir archivo").publicMessage);
    } finally {
      setUploading(false);
    }
  }

  const importJobs = () => jobs().filter((j) => j.type !== "export");

  return (
    <AppPage>
      <div style={{ padding: "1.5rem" }}>
        <h1 style={{ margin: "0 0 1.5rem", "font-size": "1.25rem" }}>
          Importaciones
        </h1>

        <div
          style={{
            padding: "1rem",
            border: "1px solid #e5e7eb",
            "border-radius": "0.5rem",
            "margin-bottom": "2rem",
            background: "#f9fafb",
          }}
        >
          <h2 style={{ margin: "0 0 1rem", "font-size": "1rem" }}>
            Subir Archivo
          </h2>
          <form
            onSubmit={(e) => void handleUpload(e)}
            style={{
              display: "flex",
              "flex-direction": "column",
              gap: "0.75rem",
              "max-width": "24rem",
            }}
          >
            <div
              style={{
                display: "flex",
                "flex-direction": "column",
                gap: "0.25rem",
              }}
            >
              <label style={{ "font-size": "0.875rem" }}>
                Tipo
                <select
                  name="type"
                  required
                  style={{
                    padding: "0.5rem",
                    border: "1px solid #d1d5db",
                    "border-radius": "0.375rem",
                  }}
                >
                  <option value="import_status">Estado</option>
                  <option value="import_prioridad">Prioridad</option>
                </select>
              </label>
            </div>
            <div
              style={{
                display: "flex",
                "flex-direction": "column",
                gap: "0.25rem",
              }}
            >
              <label style={{ "font-size": "0.875rem" }}>
                Archivo CSV
                <input
                  type="file"
                  name="file"
                  accept=".csv"
                  required
                  style={{ "font-size": "0.875rem" }}
                />
              </label>
            </div>
            {error() && (
              <p
                style={{ color: "#dc2626", "font-size": "0.875rem", margin: 0 }}
              >
                {error()}
              </p>
            )}
            <button
              type="submit"
              disabled={uploading()}
              style={{
                padding: "0.5rem",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                "border-radius": "0.375rem",
                cursor: "pointer",
                "font-size": "0.875rem",
              }}
            >
              {uploading() ? "Subiendo..." : "Subir"}
            </button>
          </form>
        </div>

        <h2 style={{ margin: "0 0 0.75rem", "font-size": "1rem" }}>
          Historial
        </h2>
        <div
          style={{ display: "flex", "flex-direction": "column", gap: "0.5rem" }}
        >
          <For each={importJobs()}>
            {(job) => (
              <A
                href={`/integrations/imports/${job.id}`}
                style={{
                  display: "flex",
                  "justify-content": "space-between",
                  "align-items": "center",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e5e7eb",
                  "border-radius": "0.5rem",
                  "text-decoration": "none",
                  color: "inherit",
                  background: "#fff",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      "font-size": "0.875rem",
                      "font-weight": "600",
                    }}
                  >
                    Job #{job.id} — {job.type}
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
              </A>
            )}
          </For>
        </div>
      </div>
    </AppPage>
  );
}
