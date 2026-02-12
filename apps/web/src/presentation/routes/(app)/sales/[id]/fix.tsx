import { createAsync, useParams, useNavigate } from "@solidjs/router";
import { Show, For } from "solid-js";
import { Button } from "~/presentation/ui/primitives/button";
import { getSale, getSaleRejections, resubmitSale } from "~/presentation/actions/sales";

export default function FixSalePage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const sale = createAsync(() => getSale(Number(params.id)));
  const rejections = createAsync(() => getSaleRejections(Number(params.id)));

  const handleResubmit = async () => {
    await resubmitSale(Number(params.id));
    navigate("/leads");
  };

  return (
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Corregir Venta</h1>
        <Button variant="secondary" onClick={() => navigate("/leads")}>
          Volver
        </Button>
      </div>

      <Show when={rejections()}>
        <div class="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <h2 class="font-bold text-red-900 mb-4">
            Correcciones Requeridas
          </h2>
          <div class="space-y-3">
            <For each={rejections()}>
              {(rejection) => (
                <div class="bg-white border border-red-300 rounded p-4">
                  <p class="font-semibold text-gray-900 mb-1">
                    Campo: {rejection.field_id}
                  </p>
                  <p class="text-sm text-gray-700">{rejection.reviewer_note}</p>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <div class="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate("/leads")}>
          Cancelar
        </Button>
        <Button onClick={handleResubmit}>
          Reenviar para Validación
        </Button>
      </div>
    </div>
  );
}
