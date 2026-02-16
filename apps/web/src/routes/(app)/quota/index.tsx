import { createResource, createSignal, Show } from "solid-js";

import { getQuotaStatus, allocateQuota } from "~/actions/quota";
import { QuotaDisplay } from "~/components/features/quota/quota-display";
import { useToast } from "~/components/feedback/toast-provider";
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
    <div class="space-y-6 max-w-2xl">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Gestión de cuotas</h1>
        <p class="text-sm text-gray-500 mt-1">
          Asigna cuotas diarias a tus ejecutivos
        </p>
      </div>

      <Show when={quotaValues()}>
        {(values) => (
          <QuotaDisplay used={values().used} total={values().total} />
        )}
      </Show>
      <Show when={!currentQuota().allocated}>
        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <p class="text-sm text-gray-500">
            Sin cuota asignada por el momento.
          </p>
        </div>
      </Show>

      <div class="bg-white border border-gray-200 rounded-lg p-6">
        <h3 class="font-semibold mb-4">Asignar cuota</h3>
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
      </div>
    </div>
  );
}
