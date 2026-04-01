import { useNavigate, useParams } from "@solidjs/router";
import { createSignal } from "solid-js";

import { completeExecutiveInput } from "~/actions/lead-pipeline/leads";
import { AppPage } from "~/components/layout/page";
import { toAppError } from "~/lib/app-errors";

export default function CompleteLeadPage() {
  const params = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);
  const [proveedorActual, setProveedorActual] = createSignal("");

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    if (!(e.currentTarget instanceof HTMLFormElement)) return;
    const fd = new FormData(e.currentTarget);
    try {
      await completeExecutiveInput({
        leadId: Number(params.leadId),
        proveedorActual: proveedorActual(),
        tasaActual: Number(fd.get("tasaActual")),
        gpv: Number(fd.get("gpv")),
        ticket: Number(fd.get("ticket")),
        abono: Number(fd.get("abono")),
        cantidadPos: Number(fd.get("cantidadPos")),
      });
      navigate(`/leads/${params.leadId}`);
    } catch (err) {
      setError(toAppError(err, "Error al guardar").publicMessage);
    } finally {
      setSubmitting(false);
    }
  }

  const fieldStyle = {
    display: "flex",
    "flex-direction": "column" as const,
    gap: "0.25rem",
  };
  const inputStyle = {
    padding: "0.5rem",
    border: "1px solid #d1d5db",
    "border-radius": "0.375rem",
    "font-size": "0.875rem",
  };
  const labelStyle = { "font-size": "0.875rem", color: "#374151" };

  return (
    <AppPage>
      <div style={{ padding: "1.5rem", "max-width": "32rem" }}>
        <h1 style={{ margin: "0 0 1.5rem", "font-size": "1.25rem" }}>
          Completar Informacion Comercial
        </h1>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          style={{ display: "flex", "flex-direction": "column", gap: "1rem" }}
        >
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Proveedor Actual
              <input
                name="proveedorActual"
                required
                style={inputStyle}
                value={proveedorActual()}
                onInput={(e) => setProveedorActual(e.currentTarget.value)}
              />
            </label>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Tasa Actual
              <input
                name="tasaActual"
                type="number"
                step="0.01"
                min="0"
                required
                style={inputStyle}
              />
            </label>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>
              GPV
              <input
                name="gpv"
                type="number"
                step="0.01"
                min="0"
                required
                style={inputStyle}
              />
            </label>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Ticket
              <input
                name="ticket"
                type="number"
                step="0.01"
                min="0"
                required
                style={inputStyle}
              />
            </label>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Abono
              <input
                name="abono"
                type="number"
                step="0.01"
                min="0"
                required
                style={inputStyle}
              />
            </label>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Cantidad POS
              <input
                name="cantidadPos"
                type="number"
                min="0"
                step="1"
                required
                style={inputStyle}
              />
            </label>
          </div>
          {error() && (
            <p style={{ color: "#dc2626", "font-size": "0.875rem", margin: 0 }}>
              {error()}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting()}
            style={{
              padding: "0.625rem",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              "border-radius": "0.375rem",
              cursor: "pointer",
              "font-size": "0.875rem",
            }}
          >
            {submitting() ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </div>
    </AppPage>
  );
}
