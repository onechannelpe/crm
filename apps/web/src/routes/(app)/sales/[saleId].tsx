import { createAsync, useParams } from "@solidjs/router";
import { Show } from "solid-js";

import { querySaleDetail } from "~/actions/pipeline/queries/sales";
import { AppPage } from "~/components/layout/page";

export default function LeadSaleDetailPage() {
  const params = useParams<{ saleId: string }>();
  const sale = createAsync(() => querySaleDetail(Number(params.saleId)));

  return (
    <AppPage>
      <Show
        when={sale()}
        fallback={<p style={{ padding: "1.5rem" }}>Cargando...</p>}
      >
        {(s) => (
          <div style={{ padding: "1.5rem", "max-width": "36rem" }}>
            <h1 style={{ margin: "0 0 1.5rem", "font-size": "1.25rem" }}>
              Venta #{s().id}
            </h1>
            <dl
              style={{
                display: "grid",
                "grid-template-columns": "1fr 1fr",
                gap: "0.5rem 1rem",
              }}
            >
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                Proveedor Actual
              </dt>
              <dd style={{ margin: 0 }}>{s().proveedor_actual}</dd>
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                Tasa Actual
              </dt>
              <dd style={{ margin: 0 }}>{s().tasa_actual}</dd>
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>GPV</dt>
              <dd style={{ margin: 0 }}>{s().gpv}</dd>
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                Ticket
              </dt>
              <dd style={{ margin: 0 }}>{s().ticket}</dd>
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                Abono
              </dt>
              <dd style={{ margin: 0 }}>{s().abono}</dd>
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                Cantidad POS
              </dt>
              <dd style={{ margin: 0 }}>{s().cantidad_pos}</dd>
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                Banco
              </dt>
              <dd style={{ margin: 0 }}>{s().banco}</dd>
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                Nro. Cuenta
              </dt>
              <dd style={{ margin: 0 }}>{s().nro_cuenta}</dd>
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>CCI</dt>
              <dd style={{ margin: 0 }}>{s().cci ?? "—"}</dd>
              <dt style={{ color: "#6b7280", "font-size": "0.875rem" }}>
                Fecha
              </dt>
              <dd style={{ margin: 0 }}>
                {new Date(s().created_at).toLocaleString()}
              </dd>
            </dl>
          </div>
        )}
      </Show>
    </AppPage>
  );
}
