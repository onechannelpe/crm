import { query, createAsync, action, revalidate } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import {
  getPendingSales,
  approveChargeNote,
  rejectChargeNote,
} from "~/lib/server/api";
import Button from "~/components/shared/button";
import RejectionForm from "~/components/sales/rejection-form";
import EmptyState from "~/components/shared/empty-state";

const loadPendingSales = query(async () => {
  "use server";
  return getPendingSales();
}, "pending-sales");

const approveAction = action(async (id: number) => {
  "use server";
  await approveChargeNote(id);
  revalidate("pending-sales");
});

const rejectAction = action(
  async (id: number, rejections: Array<{ fieldId: string; note: string }>) => {
    "use server";
    await rejectChargeNote(id, rejections);
    revalidate("pending-sales");
  },
);

export const route = {
  preload: () => loadPendingSales(),
};

export default function ValidationPage() {
  const pending = createAsync(() => loadPendingSales());
  const [showReject, setShowReject] = createSignal<number | null>(null);

  const handleReject = async (id: number, rejections: any[]) => {
    await rejectAction(id, rejections);
    setShowReject(null);
  };

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Validación de ventas</h1>
        <p class="text-sm text-gray-500 mt-1">
          {pending()?.length || 0} ventas pendientes
        </p>
      </div>

      <Show
        when={pending()?.length}
        fallback={
          <EmptyState
            title="No hay ventas pendientes"
            description="Las ventas enviadas aparecerán aquí para validación"
          />
        }
      >
        <div class="space-y-4">
          <For each={pending()}>
            {(sale) => (
              <div class="bg-white border border-gray-200 rounded-lg p-6">
                <div class="flex items-start justify-between mb-4">
                  <div>
                    <h3 class="font-semibold text-lg">Venta #{sale.id}</h3>
                    <p class="text-sm text-gray-500">
                      Contacto ID: {sale.contact_id}
                    </p>
                    <p class="text-xs text-gray-400 mt-1">
                      Enviada: {new Date(sale.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded">
                    {sale.status}
                  </span>
                </div>

                <Show
                  when={showReject() !== sale.id}
                  fallback={
                    <RejectionForm
                      onReject={(rejections) =>
                        handleReject(sale.id, rejections)
                      }
                      onCancel={() => setShowReject(null)}
                    />
                  }
                >
                  <div class="flex gap-2">
                    <form
                      action={approveAction}
                      method="post"
                      onSubmit={(e) => {
                        e.preventDefault();
                        approveAction(sale.id);
                      }}
                    >
                      <Button type="submit" variant="success">
                        Aprobar
                      </Button>
                    </form>
                    <Button
                      variant="danger"
                      onClick={() => setShowReject(sale.id)}
                    >
                      Rechazar
                    </Button>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
