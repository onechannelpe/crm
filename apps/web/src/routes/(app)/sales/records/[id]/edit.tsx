import { useParams, useNavigate } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";

import {
  getSalesRecordFixContext,
  submitSalesRecord,
} from "~/actions/sales-records";
import { useToast } from "~/components/feedback/toast-provider";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Textarea } from "~/components/ui/input/textarea";
import { getErrorMessage } from "~/lib/errors";

import styles from "../../edit-sale-page.module.css";

export default function FixSalePage() {
  const params = useParams();
  const navigate = useNavigate();
  const noteId = () => Number(params.id);
  const [loading, setLoading] = createSignal(false);
  const [fixNotes, setFixNotes] = createSignal("");
  const [fixContext] = createResource(noteId, getSalesRecordFixContext);
  const { showToast } = useToast();

  const canResubmit = () => {
    const status = fixContext()?.status;
    return status === "rejected" || status === "draft";
  };

  async function handleResubmit(e: Event) {
    e.preventDefault();
    if (!fixNotes().trim()) {
      showToast("error", "Please describe the corrections made");
      return;
    }
    setLoading(true);
    try {
      await submitSalesRecord(noteId());
      showToast("success", "Sales record resubmitted");
      navigate("/sales/confirmations");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Resubmit failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppPage width="medium">
      <Show when={fixContext()}>
        <form
          onSubmit={(e) => {
            void handleResubmit(e);
          }}
        >
          <div class={styles.panelPadded}>
            <Show when={fixContext()?.client}>
              <div class={styles.rejectionBlock}>
                <h2 class={styles.blockTitle}>Client snapshot</h2>
                <p class={styles.rejectionNote}>
                  {fixContext()?.client?.companyName ?? "Unknown company"}
                </p>
                <p class={styles.rejectionNote}>
                  {fixContext()?.client?.contactName ?? "Unknown contact"} -{" "}
                  {fixContext()?.client?.dni ?? "No DNI"}
                </p>
              </div>
            </Show>

            <Show when={(fixContext()?.addresses.length ?? 0) > 0}>
              <div class={styles.rejectionBlock}>
                <h2 class={styles.blockTitle}>Addresses</h2>
                <ul class={styles.rejectionList}>
                  <For each={fixContext()?.addresses ?? []}>
                    {(address) => (
                      <li class={styles.rejectionItem}>
                        <p class={styles.rejectionField}>
                          {address.addressType}{" "}
                          {address.isPrimary === 1 ? "(primary)" : ""}
                        </p>
                        <p class={styles.rejectionNote}>{address.fullText}</p>
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </Show>

            <Show when={(fixContext()?.products.length ?? 0) > 0}>
              <div class={styles.rejectionBlock}>
                <h2 class={styles.blockTitle}>Products</h2>
                <ul class={styles.rejectionList}>
                  <For each={fixContext()?.products ?? []}>
                    {(line) => (
                      <li class={styles.rejectionItem}>
                        <p class={styles.rejectionField}>{line.productName}</p>
                        <p class={styles.rejectionNote}>
                          Quantity: {line.quantity}
                        </p>
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </Show>

            <div class={styles.formBlock}>
              <h2 class={styles.blockTitle}>Corrections made</h2>
              <p class={styles.blockDescription}>
                Describe what you changed, then resubmit this sales record for
                confirmation.
              </p>
              <Textarea
                label="Correction notes"
                value={fixNotes()}
                onInput={(e) => setFixNotes(e.currentTarget.value)}
                placeholder="Updated phone number per client confirmation..."
                rows={4}
                required
              />
            </div>

            <div class={styles.actions}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/sales/records/new")}
              >
                Create new record
              </Button>
              <Button type="submit" disabled={loading() || !canResubmit()}>
                {loading() ? "Submitting..." : "Resubmit for approval"}
              </Button>
            </div>
          </div>
        </form>
      </Show>
    </AppPage>
  );
}
