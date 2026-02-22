import { useParams, useNavigate } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";

import { getSaleFixContext, submitSale } from "~/actions/sales";
import { useToast } from "~/components/feedback/toast-provider";
import { AppPage, AppPageHeader } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Textarea } from "~/components/ui/input/textarea";
import { getErrorMessage } from "~/lib/errors";

import styles from "../fix-sale-page.module.css";

export default function FixSalePage() {
  const params = useParams();
  const navigate = useNavigate();
  const noteId = () => Number(params.id);
  const [loading, setLoading] = createSignal(false);
  const [fixNotes, setFixNotes] = createSignal("");
  const [fixContext] = createResource(noteId, getSaleFixContext);
  const { showToast } = useToast();

  const hasRejections = () => (fixContext()?.rejections?.length ?? 0) > 0;

  async function handleResubmit(e: Event) {
    e.preventDefault();
    if (!fixNotes().trim()) {
      showToast("error", "Please describe the corrections made");
      return;
    }
    setLoading(true);
    try {
      await submitSale(noteId());
      showToast("success", "Sales note resubmitted");
      navigate("/review");
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
        title={`Fix sale #${noteId()}`}
        description="Address reviewer feedback and resubmit for approval."
        actions={
          <Button variant="secondary" onClick={() => navigate("/sales/new")}>
            Back to draft
          </Button>
        }
      />

      <Show when={fixContext()}>
        <form
          onSubmit={(e) => {
            void handleResubmit(e);
          }}
        >
          <section class={styles.panel}>
            <Show when={hasRejections()}>
              <div class={styles.rejectionBlock}>
                <h2 class={styles.blockTitle}>Reviewer feedback</h2>
                <ul class={styles.rejectionList}>
                  <For each={fixContext()?.rejections ?? []}>
                    {(rejection) => (
                      <li class={styles.rejectionItem}>
                        <p class={styles.rejectionField}>
                          {rejection.field_id}
                        </p>
                        <p class={styles.rejectionNote}>
                          {rejection.reviewer_note ??
                            "No specific note provided"}
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
                Describe what you changed to address the feedback. Make your
                edits in the draft, then return here to resubmit.
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
                onClick={() => navigate("/sales/new")}
              >
                Edit draft
              </Button>
              <Button type="submit" disabled={loading()}>
                {loading() ? "Submitting..." : "Resubmit for approval"}
              </Button>
            </div>
          </section>
        </form>
      </Show>
    </AppPage>
  );
}
