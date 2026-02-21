import { useParams, useNavigate } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";

import { getSaleFixContext, submitSale } from "~/actions/sales";
import { useToast } from "~/components/feedback/toast-provider";
import {
  AppPage,
  AppPageHeader,
} from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { getErrorMessage } from "~/lib/errors";
import styles from "../fix-sale-page.module.css";

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
      showToast("success", "Sales note resubmitted");
      navigate("/leads");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Resubmit failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppPage class={styles.page}>
      <AppPageHeader
        eyebrow="Sales"
        title="Fix sale"
        description="Apply reviewer feedback and resubmit."
        actions={
          <Button variant="secondary" onClick={() => navigate("/leads")}>
            Back
          </Button>
        }
      />

      <section class={styles.panel}>
        <div class={styles.alert}>
          <h2 class={styles.alertTitle}>
            Required corrections - note #{noteId()}
          </h2>
          <Show
            when={fixContext()?.rejections?.length}
            fallback={
              <p class={styles.muted}>
                No pending reviewer notes.
              </p>
            }
          >
            <ul class={styles.list}>
              <For each={fixContext()?.rejections ?? []}>
                {(rejection) => (
                  <li class={styles.item}>
                    <p class={styles.itemTitle}>
                      Field: {rejection.field_id}
                    </p>
                    <p class={styles.itemBody}>
                      {rejection.reviewer_note ?? "No reviewer note provided."}
                    </p>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>

        <div class={styles.actions}>
          <Button variant="secondary" onClick={() => navigate("/leads")}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              void handleResubmit();
            }}
            disabled={loading()}
          >
            {loading() ? "Submitting..." : "Resubmit for review"}
          </Button>
        </div>
      </section>
    </AppPage>
  );
}
