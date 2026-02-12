import { createAsync } from "@solidjs/router";
import { For, Show, createSignal } from "solid-js";
import { RejectionForm } from "~/presentation/features/sales/rejection-form";
import { Button } from "~/presentation/ui/primitives/button";
import { Card } from "~/presentation/ui/primitives/card";
import { EmptyState } from "~/presentation/ui/feedback/empty-state";
import { getPendingSales, approveSale, rejectSale } from "~/presentation/actions/sales";

export default function ValidationPage() {
  const pending = createAsync(() => getPendingSales());
  const [showReject, setShowReject] = createSignal<number | null>(null);

  const handleApprove = async (id: number) => {
    await approveSale(id);
  };

  const handleReject = async (id: number, rejections: any[]) => {
    await rejectSale(id, rejections);
    setShowReject(null);
  };

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Validación de Ventas</h1>
        <p class="text-sm text-gray-500 mt-1">
          {pending()?.length || 0} ventas pendientes
        </p>
      </div>

      <Show
        when={pending()?.length}
        fallback={
          <EmptyState
            title="No hay ventas pendientes"
            description="Las ventas enviadas aparecerán aquí"
          />
        }
      >
        <div class="space-y-4">
          <For each={pending()}>
            {(sale) => (
              <Card>
                <div class="p-6">
                  <div class="flex items-start justify-between mb-4">
                    <div>
                      <h3 class="font-semibold text-lg">Venta #{sale.id}</h3>
                      <p class="text-sm text-gray-500">
                        Contacto ID: {sale.contact_id}
                      </p>
                    </div>
                  </div>

                  <Show
                    when={showReject() !== sale.id}
                    fallback={
                      <RejectionForm
                        onReject={(rejections) => handleReject(sale.id, rejections)}
                        onCancel={() => setShowReject(null)}
                      />
                    }
                  >
                    <div class="flex gap-2">
                      <Button variant="success" onClick={() => handleApprove(sale.id)}>
                        Aprobar
                      </Button>
                      <Button variant="danger" onClick={() => setShowReject(sale.id)}>
                        Rechazar
                      </Button>
                    </div>
                  </Show>
                </div>
              </Card>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
