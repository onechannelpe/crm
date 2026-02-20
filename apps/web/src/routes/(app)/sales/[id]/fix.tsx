import { useParams, useNavigate } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";

import { getSaleFixContext, submitSale } from "~/actions/sales";
import { useToast } from "~/components/feedback/toast-provider";
import {
  AppPage,
  AppPageHeader,
  AppPageSection,
} from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { getErrorMessage } from "~/lib/errors";

export default function FixSalePage() {
  const params = useParams();
  const navigate = useNavigate();
  const noteId = () => Number(params.id);
  const [loading, setLoading] = createSignal(false);
  const [fixContext] = createResource(noteId, getSaleFixContext);
  const { showToast } = useToast();

  async function handleResubmit() {
    setLoading(true);
    try {
      await submitSale(noteId());
      showToast("success", "Nota reenviada a revisión");
      navigate("/leads");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Error al reenviar"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppPage class="mx-auto max-w-4xl">
      <AppPageHeader
        eyebrow="Ventas"
        title="Corregir venta"
        description="Revisa observaciones y vuelve a enviar la nota."
        actions={
          <Button variant="secondary" onClick={() => navigate("/leads")}>
            Volver
          </Button>
        }
      />

      <AppPageSection class="p-6">
        <div class="mb-4 rounded-2xl border-2 border-destructive/30 bg-destructive/10 p-6">
          <h2 class="mb-2 font-bold text-destructive">
            Correcciones requeridas — nota #{noteId()}
          </h2>
          <Show
            when={fixContext()?.rejections?.length}
            fallback={
              <p class="text-sm text-muted-foreground">
                No hay observaciones pendientes.
              </p>
            }
          >
            <ul class="space-y-2 text-sm text-foreground">
              <For each={fixContext()?.rejections ?? []}>
                {(rejection) => (
                  <li class="rounded-xl border border-destructive/35 bg-card p-3">
                    <p class="font-medium text-destructive">
                      Campo: {rejection.field_id}
                    </p>
                    <p class="mt-1 text-muted-foreground">
                      {rejection.reviewer_note ?? "Sin nota del validador."}
                    </p>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>

        <div class="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate("/leads")}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              void handleResubmit();
            }}
            disabled={loading()}
          >
            {loading() ? "Enviando..." : "Reenviar para validación"}
          </Button>
        </div>
      </AppPageSection>
    </AppPage>
  );
}
