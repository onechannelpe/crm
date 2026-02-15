import { useParams, useNavigate } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { getSaleFixContext, submitSale } from "~/actions/sales";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { useToast } from "~/components/feedback/toast-provider";
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
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Corregir venta</h1>
        <Button variant="secondary" onClick={() => navigate("/leads")}>
          Volver
        </Button>
      </div>

      <Card>
        <div class="p-6">
          <div class="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-4">
            <h2 class="font-bold text-red-900 mb-2">
              Correcciones requeridas — nota #{noteId()}
            </h2>
            <Show
              when={fixContext()?.rejections?.length}
              fallback={
                <p class="text-sm text-gray-700">
                  No hay observaciones pendientes.
                </p>
              }
            >
              <ul class="space-y-2 text-sm text-gray-800">
                <For each={fixContext()?.rejections ?? []}>
                  {(rejection) => (
                    <li class="rounded border border-red-200 bg-white p-3">
                      <p class="font-medium text-red-900">
                        Campo: {rejection.field_id}
                      </p>
                      <p class="text-gray-700 mt-1">
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
            <Button onClick={handleResubmit} disabled={loading()}>
              {loading() ? "Enviando..." : "Reenviar para validación"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
