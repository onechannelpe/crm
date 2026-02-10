import { action, createAsync, query, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import Button from "~/components/shared/button";
import { SalesService } from "~/lib/server/services/sales";

const loadSale = query(SalesService.getSale, "sale");
const loadRejections = query(SalesService.getRejections, "rejections");
const resubmitAction = action(
  SalesService.resubmitForValidation,
  "resubmitSale",
);

export const route = {
  preload: ({ params }: { params: { id: string } }) => {
    loadSale(params.id);
    loadRejections(params.id);
  },
};

export default function FixSale() {
  const params = useParams<{ id: string }>();
  const sale = createAsync(() => loadSale(params.id));
  const rejections = createAsync(() => loadRejections(params.id));

  return (
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Corregir venta</h1>
        <Button variant="secondary" onClick={() => window.history.back()}>
          Volver
        </Button>
      </div>

      <Show when={rejections()}>
        <div class="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <h2 class="font-bold text-red-900 mb-4 flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            Correcciones requeridas
          </h2>
          <div class="space-y-3">
            <For each={rejections()}>
              {(rejection) => (
                <div class="bg-white border border-red-300 rounded p-4">
                  <p class="font-semibold text-gray-900 mb-1">
                    Campo: {rejection.field_id.replace(/_/g, " ").toUpperCase()}
                  </p>
                  <p class="text-sm text-gray-700">{rejection.reviewer_note}</p>
                  <p class="text-xs text-gray-500 mt-2">
                    {new Date(rejection.created_at).toLocaleString()}
                  </p>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={sale()}>
        <div class="bg-white border border-gray-200 rounded-lg p-6">
          <h3 class="font-semibold mb-4">Información de la venta</h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-500">ID de Venta</p>
              <p class="font-medium">{sale()!.id}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Estado</p>
              <p class="font-medium text-red-600">{sale()!.status}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Creada</p>
              <p class="font-medium">
                {new Date(sale()!.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </Show>

      <div class="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => window.history.back()}>
          Cancelar
        </Button>
        <form
          action={resubmitAction.with(params.id)}
          method="post"
          onSubmit={(e) => {
            e.preventDefault();
            resubmitAction(params.id);
          }}
        >
          <Button type="submit">Reenviar para validación</Button>
        </form>
      </div>
    </div>
  );
}
