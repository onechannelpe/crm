import { A } from "@solidjs/router";

import { AppPage } from "~/components/layout/page";

export default function IntegrationsPage() {
  return (
    <AppPage>
      <div style={{ padding: "1.5rem" }}>
        <h1 style={{ margin: "0 0 1.5rem", "font-size": "1.25rem" }}>
          Integraciones
        </h1>
        <div
          style={{
            display: "grid",
            "grid-template-columns": "repeat(2, 1fr)",
            gap: "1rem",
            "max-width": "36rem",
          }}
        >
          <A
            href="/integrations/exports"
            style={{
              display: "block",
              padding: "1.25rem",
              border: "1px solid #e5e7eb",
              "border-radius": "0.5rem",
              "text-decoration": "none",
              color: "inherit",
              background: "#fff",
            }}
          >
            <h2 style={{ margin: "0 0 0.5rem", "font-size": "1rem" }}>
              Exportaciones
            </h2>
            <p style={{ margin: 0, "font-size": "0.875rem", color: "#6b7280" }}>
              Exportar leads a CSV
            </p>
          </A>
          <A
            href="/integrations/imports"
            style={{
              display: "block",
              padding: "1.25rem",
              border: "1px solid #e5e7eb",
              "border-radius": "0.5rem",
              "text-decoration": "none",
              color: "inherit",
              background: "#fff",
            }}
          >
            <h2 style={{ margin: "0 0 0.5rem", "font-size": "1rem" }}>
              Importaciones
            </h2>
            <p style={{ margin: 0, "font-size": "0.875rem", color: "#6b7280" }}>
              Importar estado o prioridad desde CSV
            </p>
          </A>
        </div>
      </div>
    </AppPage>
  );
}
