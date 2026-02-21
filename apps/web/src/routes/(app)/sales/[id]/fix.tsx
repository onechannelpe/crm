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
    <AppPage class="mx-auto max-w-4xl">
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

      <section class="tw-record-index-panel p-4">
        <div class="mb-4 border border-destructive/30 bg-destructive/5 p-4">
          <h2 class="mb-2 font-bold text-destructive">
            Required corrections - note #{noteId()}
          </h2>
          <Show
            when={fixContext()?.rejections?.length}
            fallback={
              <p class="text-sm text-muted-foreground">
                No pending reviewer notes.
              </p>
            }
          >
            <ul class="space-y-2 text-sm text-foreground">
              <For each={fixContext()?.rejections ?? []}>
                {(rejection) => (
                  <li class="border border-destructive/25 bg-background px-3 py-2">
                    <p class="font-medium text-destructive">
                      Field: {rejection.field_id}
                    </p>
                    <p class="mt-1 text-muted-foreground">
                      {rejection.reviewer_note ?? "No reviewer note provided."}
                    </p>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>

        <div class="flex justify-end gap-2">
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
