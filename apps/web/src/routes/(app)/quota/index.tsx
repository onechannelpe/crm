import { createSignal, Show } from "solid-js";

import { allocateQuota } from "~/actions/quota";
import { QuotaDisplay } from "~/components/features/quota/quota-display";
import { useToast } from "~/components/feedback/toast-provider";
import { AppPage } from "~/components/layout/page";
import { useSession } from "~/components/providers/session-provider";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { getErrorMessage } from "~/lib/errors";
import { quotaStatusQuery } from "~/lib/queries/quota";
import { createOptimisticQuery } from "~/lib/ui/create-optimistic-query";

import styles from "./quota-page.module.css";

export default function QuotaPage() {
  const { data: currentQuota, update: updateQuota } = createOptimisticQuery(
    quotaStatusQuery,
    { initialValue: { allocated: false } },
  );
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
      await updateQuota({
        optimistic: (prev) => {
          if (!prev.allocated) return prev;
          if (currentUser().id !== targetExecutiveId) return prev;
          return {
            ...prev,
            total: prev.total + safeAmount,
            remaining: prev.remaining + safeAmount,
          };
        },
        commit: async () => {
          await allocateQuota(targetExecutiveId, safeAmount);
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
    <AppPage width="medium">
      <div class={styles.grid}>
        <div class={styles.left}>
          <Show
            when={quotaValues()}
            fallback={
              <div>
                <p class={styles.muted}>No quota assigned yet.</p>
              </div>
            }
          >
            {(values) => (
              <div>
                <QuotaDisplay used={values().used} total={values().total} />
              </div>
            )}
          </Show>
        </div>

        <div>
          <h3 class={`${styles.title} ${styles.titleSpaced}`}>Assign quota</h3>
          <form
            onSubmit={(e) => {
              void handleAllocate(e);
            }}
            class={styles.form}
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

            <Button type="submit" disabled={loading()} class={styles.full}>
              {loading() ? "Assigning..." : "Assign quota"}
            </Button>
          </form>
        </div>
      </div>
    </AppPage>
  );
}
