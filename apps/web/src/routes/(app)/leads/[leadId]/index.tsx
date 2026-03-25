import { A, createAsync, useParams } from "@solidjs/router";
import { Show } from "solid-js";

import { getLead } from "~/actions/pipeline/leads";
import { AppPage } from "~/components/layout/page";

export default function LeadDetailPage() {
  const params = useParams<{ leadId: string }>();
  const data = createAsync(() => getLead(Number(params.leadId)));

  return (
    <AppPage>
      <Show
        when={data()}
        fallback={<p style={{ padding: "1.5rem" }}>Cargando...</p>}
      >
        {(d) => (
          <div style={{ padding: "1.5rem", "max-width": "48rem" }}>
            <div
              style={{
                display: "flex",
                "justify-content": "space-between",
                "margin-bottom": "1rem",
              }}
            >
              <h1 style={{ margin: 0, "font-size": "1.25rem" }}>
                Lead: {d().lead.ruc}
              </h1>
              <span
                style={{
                  padding: "0.25rem 0.75rem",
                  background: "#dbeafe",
                  color: "#1e40af",
                  "border-radius": "9999px",
                  "font-size": "0.75rem",
                }}
              >
                {d().lead.stage}
              </span>
            </div>

            <dl
              style={{
                display: "grid",
                "grid-template-columns": "1fr 1fr",
                gap: "0.5rem 1rem",
                "margin-bottom": "1.5rem",
              }}
            >
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                Razon Social
              </dt>
              <dd style={{ margin: 0 }}>{d().lead.razon_social ?? "—"}</dd>
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                Direccion
              </dt>
              <dd style={{ margin: 0 }}>{d().lead.address ?? "—"}</dd>
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                Estado
              </dt>
              <dd style={{ margin: 0 }}>{d().lead.estado ?? "—"}</dd>
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                Prioridad
              </dt>
              <dd style={{ margin: 0 }}>{d().lead.prioridad ?? "—"}</dd>
            </dl>

            <Show when={d().lead.stage === "NEEDS_EXECUTIVE_INPUT"}>
              <A
                href={`/leads/${d().lead.id}/complete`}
                style={{
                  display: "inline-block",
                  background: "#2563eb",
                  color: "#fff",
                  padding: "0.5rem 1rem",
                  "border-radius": "0.375rem",
                  "text-decoration": "none",
                  "font-size": "0.875rem",
                }}
              >
                Completar Informacion Comercial
              </A>
            </Show>

            <Show when={d().lead.stage === "READY_FOR_SALE"}>
              <A
                href={`/sales/new/${d().lead.id}`}
                style={{
                  display: "inline-block",
                  background: "#16a34a",
                  color: "#fff",
                  padding: "0.5rem 1rem",
                  "border-radius": "0.375rem",
                  "text-decoration": "none",
                  "font-size": "0.875rem",
                }}
              >
                Crear Venta
              </A>
            </Show>

            <Show when={d().commercialInput}>
              {(ci) => (
                <div
                  style={{
                    "margin-top": "1.5rem",
                    padding: "1rem",
                    border: "1px solid #e5e7eb",
                    "border-radius": "0.5rem",
                  }}
                >
                  <h2 style={{ margin: "0 0 0.75rem", "font-size": "1rem" }}>
                    Informacion Comercial
                  </h2>
                  <dl
                    style={{
                      display: "grid",
                      "grid-template-columns": "1fr 1fr",
                      gap: "0.25rem 1rem",
                    }}
                  >
                    <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                      Proveedor Actual
                    </dt>
                    <dd style={{ margin: 0 }}>
                      {ci().proveedor_actual ?? "—"}
                    </dd>
                    <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                      Tasa Actual
                    </dt>
                    <dd style={{ margin: 0 }}>{ci().tasa_actual ?? "—"}</dd>
                    <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                      GPV
                    </dt>
                    <dd style={{ margin: 0 }}>{ci().gpv ?? "—"}</dd>
                    <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                      Ticket
                    </dt>
                    <dd style={{ margin: 0 }}>{ci().ticket ?? "—"}</dd>
                    <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                      Abono
                    </dt>
                    <dd style={{ margin: 0 }}>{ci().abono ?? "—"}</dd>
                    <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                      Cantidad POS
                    </dt>
                    <dd style={{ margin: 0 }}>{ci().cantidad_pos ?? "—"}</dd>
                  </dl>
                </div>
              )}
            </Show>
          </div>
        )}
      </Show>
    </AppPage>
  );
}
