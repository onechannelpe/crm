import { useAction, useSubmission } from "@solidjs/router";
import { createSignal, Show } from "solid-js";

import { QuotaDisplay } from "~/components/features/quota/quota-display";
import { useToast } from "~/components/feedback/toast-provider";
import { AppPage } from "~/components/layout/page";
import { useSession } from "~/components/providers/session-provider";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { getErrorMessage } from "~/lib/errors";
import { allocateQuotaMutation } from "~/lib/mutations/quota";
import { quotaStatusQuery } from "~/lib/queries/quota";
import { createOptimisticQuery } from "~/lib/ui/create-optimistic-query";

import styles from "./quota-page.module.css";

export default function QuotaPage() {
  const { data: currentQuota, update: updateQuota } = createOptimisticQuery(
    quotaStatusQuery,
    { initialValue: { allocated: false } },
  );
  const { currentUser } = useSession();
  const allocateQuota = useAction(allocateQuotaMutation);
  const allocating = useSubmission(allocateQuotaMutation);
  const [execId, setExecId] = createSignal("");
  const [amount, setAmount] = createSignal("10");
  const { showToast } = useToast();
  const quotaValues = () => {
    const current = currentQuota();
    if (!current?.allocated) return null;
    return { used: current.used, total: current.total };
  };

  async function handleAllocate(e: Event) {
    e.preventDefault();
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
      showToast("success", "Cuota asignada");
      setExecId("");
      setAmount("10");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to assign quota"));
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
                <p class={styles.muted}>Sin cuota asignada aún.</p>
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
          <h3 class={`${styles.title} ${styles.titleSpaced}`}>Asignar cuota</h3>
          <form
            onSubmit={(e) => {
              void handleAllocate(e);
            }}
            class={styles.form}
          >
            <Input
              type="number"
              label="ID de ejecutivo"
              value={execId()}
              onInput={(e) => setExecId(e.currentTarget.value)}
              required
            />

            <Input
              type="number"
              label="Cantidad de clientes"
              value={amount()}
              onInput={(e) => setAmount(e.currentTarget.value)}
              min="1"
              max="100"
              required
            />

            <Button
              type="submit"
              disabled={allocating.pending}
              class={styles.full}
            >
              {allocating.pending ? "Asignando..." : "Asignar cuota"}
            </Button>
          </form>
        </div>
      </div>
    </AppPage>
  );
}
