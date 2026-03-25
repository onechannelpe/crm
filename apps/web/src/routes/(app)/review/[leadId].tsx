import { createAsync, useNavigate, useParams } from "@solidjs/router";
import { createSignal, Show } from "solid-js";

import { getLead } from "~/actions/pipeline/leads";
import {
  updateLeadEstado,
  updateLeadPrioridad,
} from "~/actions/pipeline/review";
import { AppPage } from "~/components/layout/page";
import { toAppError } from "~/lib/app-errors";
import { ESTADO_VALUES, PRIORIDAD_VALUES } from "~/lib/db/types";
import type { Estado, Prioridad } from "~/lib/db/types";

export default function ReviewLeadPage() {
  const params = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const data = createAsync(() => getLead(Number(params.leadId)));
  const [error, setError] = createSignal<string | null>(null);
  const [estadoVal, setEstadoVal] = createSignal<Estado>("DISPONIBLE");
  const [estadoReason, setEstadoReason] = createSignal("");
  const [prioridadVal, setPrioridadVal] = createSignal<Prioridad>("P1");
  const [prioridadReason, setPrioridadReason] = createSignal("");

  const inputStyle = {
    padding: "0.5rem",
    border: "1px solid #d1d5db",
    "border-radius": "0.375rem",
    "font-size": "0.875rem",
  };
  const labelStyle = { "font-size": "0.875rem", color: "#374151" };
  const fieldStyle = {
    display: "flex",
    "flex-direction": "column" as const,
    gap: "0.25rem",
  };

  async function handleEstado(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    try {
      await updateLeadEstado({
        leadId: Number(params.leadId),
        estado: estadoVal(),
        reason: estadoReason(),
      });
      navigate(`/review`);
    } catch (err) {
      setError(toAppError(err, "Error").publicMessage);
    }
  }

  async function handlePrioridad(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    try {
      await updateLeadPrioridad({
        leadId: Number(params.leadId),
        prioridad: prioridadVal(),
        reason: prioridadReason(),
      });
      navigate(`/review`);
    } catch (err) {
      setError(toAppError(err, "Error").publicMessage);
    }
  }

  return (
    <AppPage>
      <Show
        when={data()}
        fallback={<p style={{ padding: "1.5rem" }}>Cargando...</p>}
      >
        {(d) => (
          <div style={{ padding: "1.5rem", "max-width": "36rem" }}>
            <h1 style={{ margin: "0 0 0.5rem", "font-size": "1.25rem" }}>
              Revisar Lead: {d().lead.ruc}
            </h1>
            <p style={{ margin: "0 0 1.5rem", color: "#6b7280" }}>
              {d().lead.razon_social ?? "—"} — Stage: {d().lead.stage}
            </p>

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
              style={{
                display: "grid",
                "grid-template-columns": "1fr 1fr",
                gap: "1.5rem",
              }}
            >
              <form
                onSubmit={(e) => void handleEstado(e)}
                style={{
                  display: "flex",
                  "flex-direction": "column",
                  gap: "0.75rem",
                }}
              >
                <h2 style={{ margin: 0, "font-size": "1rem" }}>
                  Actualizar Estado
                </h2>
                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Estado
                    <select
                      value={estadoVal()}
                      onInput={(e) => {
                        const v = ESTADO_VALUES.find(
                          (o) => o === e.currentTarget.value,
                        );
                        if (v) setEstadoVal(v);
                      }}
                      required
                      style={inputStyle}
                    >
                      <option value="DISPONIBLE">DISPONIBLE</option>
                      <option value="SIN RESULTADO">SIN RESULTADO</option>
                      <option value="CARTERIZADO">CARTERIZADO</option>
                      <option value="STOCK">STOCK</option>
                    </select>
                  </label>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Razon
                    <input
                      value={estadoReason()}
                      onInput={(e) => setEstadoReason(e.currentTarget.value)}
                      required
                      style={inputStyle}
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  style={{
                    padding: "0.5rem",
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    "border-radius": "0.375rem",
                    cursor: "pointer",
                  }}
                >
                  Guardar Estado
                </button>
              </form>

              <form
                onSubmit={(e) => void handlePrioridad(e)}
                style={{
                  display: "flex",
                  "flex-direction": "column",
                  gap: "0.75rem",
                }}
              >
                <h2 style={{ margin: 0, "font-size": "1rem" }}>
                  Actualizar Prioridad
                </h2>
                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Prioridad
                    <select
                      value={prioridadVal()}
                      onInput={(e) => {
                        const v = PRIORIDAD_VALUES.find(
                          (o) => o === e.currentTarget.value,
                        );
                        if (v) setPrioridadVal(v);
                      }}
                      required
                      style={inputStyle}
                    >
                      <option value="P1">P1</option>
                      <option value="P2">P2</option>
                      <option value="SIN RESULTADO">SIN RESULTADO</option>
                    </select>
                  </label>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Razon
                    <input
                      value={prioridadReason()}
                      onInput={(e) => setPrioridadReason(e.currentTarget.value)}
                      required
                      style={inputStyle}
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  style={{
                    padding: "0.5rem",
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    "border-radius": "0.375rem",
                    cursor: "pointer",
                  }}
                >
                  Guardar Prioridad
                </button>
              </form>
            </div>
          </div>
        )}
      </Show>
    </AppPage>
  );
}
