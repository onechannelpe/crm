import { createResource, createSignal, Show } from "solid-js";

import { getQuotaStatus, allocateQuota } from "~/actions/quota";
import { QuotaDisplay } from "~/components/features/quota/quota-display";
import { useToast } from "~/components/feedback/toast-provider";
import { AppPage, AppPageHeader } from "~/components/layout/page";
import { useSession } from "~/components/providers/session-provider";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
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
      showToast("success", "Quota assigned");
      setExecId("");
      setAmount("10");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to assign quota"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppPage class="max-w-4xl">
      <AppPageHeader
        eyebrow="Capacity"
        title="Quota management"
        description="Allocate daily lead capacity per executive."
      />

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div class="space-y-4">
          <Show
            when={quotaValues()}
            fallback={
              <section class="tw-record-index-panel p-4">
                <p class="text-sm text-muted-foreground">
                  No quota assigned yet.
                </p>
              </section>
            }
          >
            {(values) => (
              <QuotaDisplay used={values().used} total={values().total} />
            )}
          </Show>
        </div>

        <section class="tw-record-index-panel p-4">
          <h3 class="mb-4 text-lg font-semibold">Assign quota</h3>
          <form
            onSubmit={(e) => {
              void handleAllocate(e);
            }}
            class="space-y-4"
          >
            <Input
              type="number"
              label="Executive ID"
              value={execId()}
              onInput={(e) => setExecId(e.currentTarget.value)}
              required
            />

            <Input
              type="number"
              label="Lead amount"
              value={amount()}
              onInput={(e) => setAmount(e.currentTarget.value)}
              min="1"
              max="100"
              required
            />

            <Button type="submit" disabled={loading()} class="w-full">
              {loading() ? "Assigning..." : "Assign quota"}
            </Button>
          </form>
        </section>
      </div>
    </AppPage>
  );
}
