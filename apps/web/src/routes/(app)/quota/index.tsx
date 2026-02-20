import { createResource, createSignal, Show } from "solid-js";

import { getQuotaStatus, allocateQuota } from "~/actions/quota";
import { QuotaDisplay } from "~/components/features/quota/quota-display";
import { useToast } from "~/components/feedback/toast-provider";
import {
  AppPage,
  AppPageHeader,
  AppPageSection,
} from "~/components/layout/page";
import { useSession } from "~/components/providers/session-provider";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { getErrorMessage } from "~/lib/errors";
import { runOptimistic } from "~/lib/ui/run-optimistic";

export default function QuotaPage() {
  const [quota, { mutate, refetch }] = createResource(
    () => true,
    async () => getQuotaStatus(),
    { initialValue: { allocated: false }, ssrLoadFrom: "initial" },
  );
  const currentQuota = () => quota.latest ?? { allocated: false };
  const { currentUser } = useSession();
  const [execId, setExecId] = createSignal("");
  const [amount, setAmount] = createSignal("10");
  const [loading, setLoading] = createSignal(false);
  const { showToast } = useToast();
  const quotaValues = () => {
    const current = currentQuota();
    if (!current?.allocated) return null;
    return { used: current.used, total: current.total };
  };

  async function handleAllocate(e: Event) {
    e.preventDefault();
    setLoading(true);
    try {
      const targetExecutiveId = Number(execId());
      const safeAmount = Number(amount());
      await runOptimistic({
        read: currentQuota,
        write: (next) => mutate(() => next),
        optimistic: (prev) => {
          if (!prev.allocated) {
            return prev;
          }
          if (currentUser().id !== targetExecutiveId) {
            return prev;
          }
          return {
            ...prev,
            total: prev.total + safeAmount,
            remaining: prev.remaining + safeAmount,
          };
        },
        commit: async () => {
          await allocateQuota(targetExecutiveId, safeAmount);
        },
        reconcile: () => {
          void refetch();
        },
      });
      showToast("success", "Cuota asignada correctamente");
      setExecId("");
      setAmount("10");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Error al asignar cuota"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppPage class="max-w-4xl">
      <AppPageHeader
        eyebrow="Control de capacidad"
        title="Gestión de cuotas"
        description="Define cuántos leads puede trabajar cada ejecutivo hoy. Esta cuota afecta la asignación automática de leads."
      />

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div class="space-y-4">
          <Show
            when={quotaValues()}
            fallback={
              <AppPageSection class="p-5">
                <p class="text-sm text-muted-foreground">
                  Sin cuota asignada por el momento.
                </p>
              </AppPageSection>
            }
          >
            {(values) => (
              <QuotaDisplay used={values().used} total={values().total} />
            )}
          </Show>

          <AppPageSection class="p-5">
            <p class="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Consideraciones
            </p>
            <ul class="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Solo puedes asignar cuota al inicio de jornada.</li>
              <li>Evita sobreasignar si hay ventas pendientes de validar.</li>
              <li>Confirma el `ID` del ejecutivo antes de guardar.</li>
            </ul>
          </AppPageSection>
        </div>

        <AppPageSection class="p-6">
          <h3 class="mb-4 text-lg font-semibold">Asignar cuota</h3>
          <form
            onSubmit={(e) => {
              void handleAllocate(e);
            }}
            class="space-y-4"
          >
            <Input
              type="number"
              label="ID del ejecutivo"
              value={execId()}
              onInput={(e) => setExecId(e.currentTarget.value)}
              required
            />

            <Input
              type="number"
              label="Cantidad de leads"
              value={amount()}
              onInput={(e) => setAmount(e.currentTarget.value)}
              min="1"
              max="100"
              required
            />

            <Button type="submit" disabled={loading()} class="w-full">
              {loading() ? "Asignando..." : "Asignar cuota"}
            </Button>
          </form>
        </AppPageSection>
      </div>
    </AppPage>
  );
}
