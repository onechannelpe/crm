import { createSignal } from "solid-js";

import { requestLeadCreation } from "~/actions/pipeline/commands/leads";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { toAppError } from "~/lib/app-errors";

import { SidePanelList } from "../../components/list";
import { useSidePanel } from "../../state/use-side-panel";
import { createLeadDetailSidePanelPage } from "../../types/side-panel-page";

import styles from "./page.module.css";

export function LeadCreatePage() {
  const { closePanel, navigateTo } = useSidePanel();
  const [ruc, setRuc] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);

  async function handleSubmit() {
    const value = ruc().trim();

    if (!value) {
      setError("El RUC es obligatorio");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const result = await requestLeadCreation({
        ruc: value,
      });

      navigateTo(
        createLeadDetailSidePanelPage({
          leadId: result.leadId,
          title: value,
          subtitle: `RUC ${value}`,
        }),
        { resetStack: true },
      );
    } catch (submitError) {
      setError(
        toAppError(submitError, "Error al registrar prospecto").publicMessage,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SidePanelList>
      <div class={styles.page}>
        <div class={styles.hero}>
          <p class={styles.eyebrow}>Ingreso manual</p>
          <h2 class={styles.title}>Crear un prospecto</h2>
          <p class={styles.description}>
            Registra un prospecto nuevo usando su RUC. Cuando se cree, abriremos
            su ficha en este panel.
          </p>
        </div>

        <div class={styles.form}>
          <Input
            label="RUC"
            value={ruc()}
            onInput={(event) => setRuc(event.currentTarget.value)}
            placeholder="Ingresa el RUC"
          />
          {error() ? <p class={styles.error}>{error()}</p> : null}
          <div class={styles.actions}>
            <Button
              onClick={() => void handleSubmit()}
              disabled={submitting() || ruc().trim().length === 0}
            >
              {submitting() ? "Guardando..." : "Guardar"}
            </Button>
            <Button
              variant="outline"
              onClick={() => closePanel()}
              disabled={submitting()}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </SidePanelList>
  );
}
