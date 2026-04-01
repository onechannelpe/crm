import { createSignal } from "solid-js";

import { requestRecordCreation } from "~/actions/pipeline/commands/records";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { toAppError } from "~/lib/app-errors";

import { SidePanelList } from "../../components/side-panel-list";
import { useSidePanel } from "../../state/use-side-panel";
import { createLeadDetailSidePanelPage } from "../../types/side-panel-page";

export function SidePanelLeadCreatePage() {
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
      const result = await requestRecordCreation({
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
      <div class="space-y-4 py-3">
        <Input
          label="RUC"
          value={ruc()}
          onInput={(event) => setRuc(event.currentTarget.value)}
          placeholder="Ingresa el RUC"
        />
        {error() ? <p class="text-sm text-destructive">{error()}</p> : null}
        <div class="flex gap-2">
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
    </SidePanelList>
  );
}
