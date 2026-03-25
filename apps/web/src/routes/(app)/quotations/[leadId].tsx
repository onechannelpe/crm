import { createAsync, useNavigate, useParams } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";

import {
  approveLeadForSale,
  createQuotation,
  getLeadQuotations,
} from "~/actions/pipeline/quotations";
import { AppPage } from "~/components/layout/page";
import { toAppError } from "~/lib/app-errors";

export default function LeadQuotationPage() {
  const params = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const data = createAsync(() => getLeadQuotations(Number(params.leadId)));
  const [error, setError] = createSignal<string | null>(null);

  const inputStyle = {
    padding: "0.5rem",
    border: "1px solid #d1d5db",
    "border-radius": "0.375rem",
    "font-size": "0.875rem",
  };

  async function handleCreateQuotation(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    if (!(e.currentTarget instanceof HTMLFormElement)) return;
    const fd = new FormData(e.currentTarget);
    try {
      await createQuotation({
        leadId: Number(params.leadId),
        paybackPricing: Number(fd.get("paybackPricing")),
        tarifaDebito: Number(fd.get("tarifaDebito")),
        tarifaCredito: Number(fd.get("tarifaCredito")),
        tarifaForaneo: Number(fd.get("tarifaForaneo")),
        fee: Number(fd.get("fee")),
        moneda: fd.get("moneda") === "USD" ? "USD" : "PEN",
      });
      navigate(`/quotations/${params.leadId}`);
    } catch (err) {
      setError(toAppError(err, "Error").publicMessage);
    }
  }

  async function handleApprove() {
    setError(null);
    try {
      await approveLeadForSale(Number(params.leadId));
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
          <div style={{ padding: "1.5rem", "max-width": "40rem" }}>
            <h1 style={{ margin: "0 0 0.25rem", "font-size": "1.25rem" }}>
              Cotizacion — {d().lead.ruc}
            </h1>
            <p style={{ margin: "0 0 1.5rem", color: "#6b7280" }}>
              Stage: {d().lead.stage}
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

            <Show when={d().lead.stage === "READY_FOR_QUOTATION"}>
              <form
                onSubmit={(e) => void handleCreateQuotation(e)}
                style={{
                  display: "flex",
                  "flex-direction": "column",
                  gap: "0.75rem",
                  "margin-bottom": "2rem",
                }}
              >
                <h2 style={{ margin: 0, "font-size": "1rem" }}>
                  Nueva Cotizacion
                </h2>
                {(
                  [
                    "paybackPricing",
                    "tarifaDebito",
                    "tarifaCredito",
                    "tarifaForaneo",
                    "fee",
                  ] as const
                ).map((field) => (
                  <div
                    style={{
                      display: "flex",
                      "flex-direction": "column",
                      gap: "0.25rem",
                    }}
                  >
                    <label style={{ "font-size": "0.875rem" }}>
                      {field}
                      <input
                        name={field}
                        type="number"
                        step="0.0001"
                        min="0"
                        required
                        style={inputStyle}
                      />
                    </label>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    "flex-direction": "column",
                    gap: "0.25rem",
                  }}
                >
                  <label style={{ "font-size": "0.875rem" }}>
                    Moneda
                    <select name="moneda" required style={inputStyle}>
                      <option value="PEN">PEN</option>
                      <option value="USD">USD</option>
                    </select>
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
                  Crear Cotizacion
                </button>
              </form>
            </Show>

            <Show when={d().lead.stage === "QUOTED"}>
              <button
                onClick={() => void handleApprove()}
                style={{
                  padding: "0.625rem 1.25rem",
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  "border-radius": "0.375rem",
                  cursor: "pointer",
                  "margin-bottom": "1.5rem",
                }}
              >
                Aprobar para Venta
              </button>
            </Show>

            <Show when={d().quotations.length > 0}>
              <h2 style={{ "font-size": "1rem", "margin-bottom": "0.75rem" }}>
                Historial de Cotizaciones
              </h2>
              <div
                style={{
                  display: "flex",
                  "flex-direction": "column",
                  gap: "0.5rem",
                }}
              >
                <For each={d().quotations}>
                  {(q) => (
                    <div
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #e5e7eb",
                        "border-radius": "0.375rem",
                      }}
                    >
                      <p
                        style={{ margin: "0 0 0.25rem", "font-weight": "600" }}
                      >
                        Version {q.version} — {q.moneda}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          "font-size": "0.875rem",
                          color: "#6b7280",
                        }}
                      >
                        Debito: {q.tarifa_debito} | Credito: {q.tarifa_credito}{" "}
                        | Foraneo: {q.tarifa_foraneo}
                      </p>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        )}
      </Show>
    </AppPage>
  );
}
