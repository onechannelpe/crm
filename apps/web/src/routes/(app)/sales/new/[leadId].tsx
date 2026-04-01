import { createAsync, useNavigate, useParams } from "@solidjs/router";
import { createSignal, Show } from "solid-js";

import { queryLeadDetail } from "~/actions/lead-pipeline/lead-detail";
import { requestSaleCreation } from "~/actions/lead-pipeline/sales";
import { AppPage } from "~/components/layout/page";
import { toAppError } from "~/lib/app-errors";

export default function NewLeadSalePage() {
  const params = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const data = createAsync(() => queryLeadDetail(Number(params.leadId)));
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);
  const [proveedorActual, setProveedorActual] = createSignal("");
  const [banco, setBanco] = createSignal("");
  const [nroCuenta, setNroCuenta] = createSignal("");
  const [cci, setCci] = createSignal("");

  const inputStyle = {
    padding: "0.5rem",
    border: "1px solid #d1d5db",
    "border-radius": "0.375rem",
    "font-size": "0.875rem",
  };
  const fieldStyle = {
    display: "flex",
    "flex-direction": "column" as const,
    gap: "0.25rem",
  };
  const labelStyle = { "font-size": "0.875rem", color: "#374151" };

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    if (!(e.currentTarget instanceof HTMLFormElement)) return;
    const fd = new FormData(e.currentTarget);
    try {
      const { id } = await requestSaleCreation({
        leadId: Number(params.leadId),
        proveedorActual: proveedorActual(),
        tasaActual: Number(fd.get("tasaActual")),
        gpv: Number(fd.get("gpv")),
        ticket: Number(fd.get("ticket")),
        abono: Number(fd.get("abono")),
        cantidadPos: Number(fd.get("cantidadPos")),
        banco: banco(),
        nroCuenta: nroCuenta(),
        cci: cci() || null,
      });
      navigate(`/sales/${id}`);
    } catch (err) {
      setError(toAppError(err, "Error al crear venta").publicMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppPage>
      <Show
        when={data()}
        fallback={<p style={{ padding: "1.5rem" }}>Cargando...</p>}
      >
        {(d) => (
          <div style={{ padding: "1.5rem", "max-width": "32rem" }}>
            <h1 style={{ margin: "0 0 0.25rem", "font-size": "1.25rem" }}>
              Nueva Venta
            </h1>
            <p style={{ margin: "0 0 1.5rem", color: "#6b7280" }}>
              Lead: {d().lead.ruc} — {d().lead.razon_social ?? "—"}
            </p>

            <form
              onSubmit={(e) => void handleSubmit(e)}
              style={{
                display: "flex",
                "flex-direction": "column",
                gap: "0.75rem",
              }}
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
              {(["tasaActual", "gpv", "ticket", "abono"] as const).map((f) => (
                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    {f}
                    <input
                      name={f}
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      style={inputStyle}
                    />
                  </label>
                </div>
              ))}
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
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Banco
                  <input
                    name="banco"
                    required
                    style={inputStyle}
                    value={banco()}
                    onInput={(e) => setBanco(e.currentTarget.value)}
                  />
                </label>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Nro. Cuenta
                  <input
                    name="nroCuenta"
                    required
                    style={inputStyle}
                    value={nroCuenta()}
                    onInput={(e) => setNroCuenta(e.currentTarget.value)}
                  />
                </label>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  CCI (requerido si no es BCP)
                  <input
                    name="cci"
                    style={inputStyle}
                    value={cci()}
                    onInput={(e) => setCci(e.currentTarget.value)}
                  />
                </label>
              </div>
              {error() && (
                <p
                  style={{
                    color: "#dc2626",
                    "font-size": "0.875rem",
                    margin: 0,
                  }}
                >
                  {error()}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting()}
                style={{
                  padding: "0.625rem",
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  "border-radius": "0.375rem",
                  cursor: "pointer",
                  "font-size": "0.875rem",
                }}
              >
                {submitting() ? "Registrando..." : "Registrar Venta"}
              </button>
            </form>
          </div>
        )}
      </Show>
    </AppPage>
  );
}
