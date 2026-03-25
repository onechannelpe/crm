import { useNavigate } from "@solidjs/router";
import { createSignal } from "solid-js";

import { registerLead } from "~/actions/pipeline/leads";
import { AppPage } from "~/components/layout/page";
import { toAppError } from "~/lib/app-errors";

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

export default function NewLeadPage() {
  const navigate = useNavigate();
  const [ruc, setRuc] = createSignal("");
  const [razonSocial, setRazonSocial] = createSignal("");
  const [address, setAddress] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { id } = await registerLead({
        ruc: ruc().trim(),
        razonSocial: razonSocial().trim() || null,
        address: address().trim() || null,
        executiveId: 0,
      });
      navigate(`/leads/${id}`);
    } catch (err) {
      setError(toAppError(err, "Error al registrar lead").publicMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppPage>
      <div style={{ padding: "1.5rem", "max-width": "32rem" }}>
        <h1 style={{ margin: "0 0 1.5rem", "font-size": "1.25rem" }}>
          Registrar Lead
        </h1>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          style={{ display: "flex", "flex-direction": "column", gap: "1rem" }}
        >
          <div style={fieldStyle}>
            <label style={labelStyle}>
              RUC
              <input
                value={ruc()}
                onInput={(e) => setRuc(e.currentTarget.value)}
                required
                style={inputStyle}
              />
            </label>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Razon Social
              <input
                value={razonSocial()}
                onInput={(e) => setRazonSocial(e.currentTarget.value)}
                style={inputStyle}
              />
            </label>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Direccion
              <input
                value={address()}
                onInput={(e) => setAddress(e.currentTarget.value)}
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
            {submitting() ? "Registrando..." : "Registrar Lead"}
          </button>
        </form>
      </div>
    </AppPage>
  );
}
